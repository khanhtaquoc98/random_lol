import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_MATCHES, normalizeRiotMatchV5 } from "@/data/sampleMatches";
import { RiotPlatformId } from "@/types/match";
import { getStoredRiotKeyConfig } from "@/lib/riotKeyManager";

/**
 * Riot Games Regional Routing Mapping:
 * - ACCOUNT-V1 uses: asia, americas, europe
 * - MATCH-V5 uses: sea (for VN2, SG2, TW2), asia (for KR, JP1), americas (for NA1), europe (for EUW1)
 */
function getAccountCluster(platform: RiotPlatformId): string {
  switch (platform) {
    case "NA1":
      return "americas";
    case "EUW1":
      return "europe";
    case "VN2":
    case "SG2":
    case "TW2":
    case "KR":
    case "JP1":
    default:
      return "asia";
  }
}

function getMatchV5Cluster(platform: RiotPlatformId): string {
  switch (platform) {
    case "VN2":
    case "SG2":
    case "TW2":
      return "sea";
    case "KR":
    case "JP1":
      return "asia";
    case "NA1":
      return "americas";
    case "EUW1":
      return "europe";
    default:
      return "sea";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const riotId = searchParams.get("riotId")?.trim() || "";
  const matchId = searchParams.get("matchId")?.trim() || "";
  const platform = (searchParams.get("platform")?.toUpperCase() ||
    "VN2") as RiotPlatformId;
  const count = Math.min(5, Math.max(1, Number(searchParams.get("count") || 3)));

  // Allow Riot API Key from request header OR dynamic server key manager (.riot-key-cache.json / .env.local)
  const storedConfig = getStoredRiotKeyConfig();
  const apiKey =
    req.headers.get("x-riot-api-key")?.trim() ||
    storedConfig.apiKey ||
    process.env.RIOT_API_KEY?.trim() ||
    "";

  // 1. Check if requesting sample matches or a specific sample matchId
  const sampleMatch = SAMPLE_MATCHES.find(
    (m) => m.matchId.toLowerCase() === matchId.toLowerCase()
  );
  if (sampleMatch) {
    return NextResponse.json({
      matches: [sampleMatch],
      source: "SAMPLE_DATA",
      message: "Đã tải dữ liệu trận đấu mẫu chuẩn cấu trúc Match-V5.",
    });
  }

  // If no Riot API Key is provided, return sample matches or helpful message
  if (!apiKey) {
    if (!riotId && !matchId) {
      return NextResponse.json({
        matches: SAMPLE_MATCHES,
        source: "SAMPLE_DATA",
        message: "Đang hiển thị danh sách trận đấu mẫu.",
      });
    }

    // Filter sample matches by Riot ID if it matches a player in sample data
    const queryLower = riotId.toLowerCase().split("#")[0];
    const matchedSamples = SAMPLE_MATCHES.filter((m) =>
      [...m.blueTeam.participants, ...m.redTeam.participants].some((p) =>
        p.riotIdGameName.toLowerCase().includes(queryLower)
      )
    );

    return NextResponse.json({
      matches: matchedSamples.length > 0 ? matchedSamples : SAMPLE_MATCHES,
      source: "SAMPLE_DATA",
      warning:
        "Chưa cấu hình RIOT_API_KEY nên hệ thống trả về dữ liệu trận đấu mẫu chuẩn Match-V5 để bạn test phân tích AI ngay. Bạn có thể nhập Riot API Key (RGAPI-...) ở phần Cấu hình API để tra cứu trực tiếp từ máy chủ Riot.",
    });
  }

  try {
    const matchCluster = getMatchV5Cluster(platform);

    // 2. Direct Match ID lookup via MATCH-V5
    if (matchId) {
      const normalizedMatchId = matchId.includes("_")
        ? matchId.toUpperCase()
        : `${platform}_${matchId}`;
      const inferredPlatform = (normalizedMatchId.split("_")[0] ||
        platform) as RiotPlatformId;
      const cluster = getMatchV5Cluster(inferredPlatform);

      const matchRes = await fetch(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
          normalizedMatchId
        )}`,
        {
          headers: { "X-Riot-Token": apiKey },
          cache: "no-store",
        }
      );

      if (!matchRes.ok) {
        const errBody = await matchRes.text();
        return NextResponse.json(
          {
            error: `Không tìm thấy trận đấu ${normalizedMatchId} từ Riot API (HTTP ${matchRes.status}).`,
            details: errBody,
          },
          { status: matchRes.status }
        );
      }

      const rawMatch = await matchRes.json();
      const normalized = normalizeRiotMatchV5(rawMatch, inferredPlatform);
      return NextResponse.json({
        matches: [normalized],
        source: "RIOT_API",
      });
    }

    // 3. Riot ID (gameName#tagLine) lookup via ACCOUNT-V1 + MATCH-V5
    if (!riotId.includes("#")) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đúng định dạng Riot ID gồm Tên#Tag (ví dụ: Levi#VN2 hoặc Hide on bush#KR1).",
        },
        { status: 400 }
      );
    }

    const [gameName, tagLine] = riotId.split("#").map((s) => s.trim());
    const accountCluster = getAccountCluster(platform);

    const accountUrl = `https://${accountCluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;

    const accountRes = await fetch(accountUrl, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });

    if (!accountRes.ok) {
      const errBody = await accountRes.text();
      const isKeyExpired = accountRes.status === 401 || accountRes.status === 403;
      return NextResponse.json(
        {
          error: isKeyExpired
            ? `Riot Development API Key đã hết hạn (24h) hoặc không hợp lệ (HTTP ${accountRes.status}). Hãy bấm "Đổi Key Nhanh" để dán key mới!`
            : `Không tìm thấy tài khoản Riot ID "${gameName}#${tagLine}" (HTTP ${accountRes.status}).`,
          keyExpired: isKeyExpired,
          details: errBody,
        },
        { status: accountRes.status }
      );
    }

    const accountData = await accountRes.json();
    const puuid: string = accountData.puuid;

    // Fetch list of Match IDs by PUUID
    const matchIdsUrl = `https://${matchCluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
      puuid
    )}/ids?start=0&count=${count}`;

    const idsRes = await fetch(matchIdsUrl, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });

    if (!idsRes.ok) {
      const errBody = await idsRes.text();
      return NextResponse.json(
        {
          error: `Không lấy được danh sách lịch sử đấu từ Match-V5 (${matchCluster}) (HTTP ${idsRes.status}).`,
          details: errBody,
        },
        { status: idsRes.status }
      );
    }

    const matchIds: string[] = await idsRes.json();
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json(
        {
          error: `Tài khoản "${gameName}#${tagLine}" chưa có trận đấu nào gần đây ở cụm máy chủ ${matchCluster.toUpperCase()}.`,
        },
        { status: 404 }
      );
    }

    // Fetch each match detail in parallel
    const matchPromises = matchIds.map(async (id) => {
      const res = await fetch(
        `https://${matchCluster}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
          id
        )}`,
        {
          headers: { "X-Riot-Token": apiKey },
          cache: "no-store",
        }
      );
      if (!res.ok) return null;
      const raw = await res.json();
      return normalizeRiotMatchV5(raw, platform);
    });

    const matches = (await Promise.all(matchPromises)).filter(Boolean);

    return NextResponse.json({
      matches,
      account: {
        puuid,
        gameName: accountData.gameName || gameName,
        tagLine: accountData.tagLine || tagLine,
      },
      source: "RIOT_API",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Lỗi kết nối tới Riot Games API.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
