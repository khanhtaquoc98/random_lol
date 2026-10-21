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
  const queueFilter = (searchParams.get("queue")?.trim() || "ALL").toUpperCase();
  const platform = (searchParams.get("platform")?.toUpperCase() ||
    "VN2") as RiotPlatformId;
  const count = Math.min(15, Math.max(1, Number(searchParams.get("count") || 10)));

  const filterMatchesByQueue = (list: typeof SAMPLE_MATCHES) => {
    if (!queueFilter || queueFilter === "ALL") return list;
    if (queueFilter === "ARAM" || queueFilter === "450") {
      return list.filter(
        (m) =>
          m.gameMode === "ARAM" ||
          m.queueName.toUpperCase().includes("ARAM")
      );
    }
    if (queueFilter === "SOLO" || queueFilter === "420") {
      return list.filter((m) => m.queueName.includes("Đơn/Đôi"));
    }
    if (queueFilter === "FLEX" || queueFilter === "440") {
      return list.filter((m) => m.queueName.includes("Linh Hoạt"));
    }
    return list;
  };

  // Allow Riot API Key from request header OR Supabase app_settings ("riot_api_key")
  const storedConfig = await getStoredRiotKeyConfig();
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
      const filtered = filterMatchesByQueue(SAMPLE_MATCHES);
      return NextResponse.json({
        matches: filtered.length > 0 ? filtered : SAMPLE_MATCHES,
        source: "SAMPLE_DATA",
        message: "Đang hiển thị danh sách trận đấu mẫu.",
      });
    }

    // Filter sample matches by Riot ID if it matches a player in sample data
    const queryLower = riotId.toLowerCase().split("#")[0];
    const matchedByPlayer = SAMPLE_MATCHES.filter((m) =>
      [...m.blueTeam.participants, ...m.redTeam.participants].some((p) =>
        p.riotIdGameName.toLowerCase().includes(queryLower)
      )
    );
    const baseList =
      matchedByPlayer.length > 0 ? matchedByPlayer : SAMPLE_MATCHES;
    const filtered = filterMatchesByQueue(baseList);

    return NextResponse.json({
      matches: filtered.length > 0 ? filtered : filterMatchesByQueue(SAMPLE_MATCHES),
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
      const isUnknownKey = errBody.includes("Unknown apikey");
      return NextResponse.json(
        {
          error: isUnknownKey
            ? `Máy chủ Riot phản hồi "Unknown apikey" (HTTP 401): Key hiện tại chưa được kích hoạt hoặc đã bị đổi khi bấm Regenerate trên developer.riotgames.com. Hãy tích Captcha -> bấm "Regenerate API Key" rồi copy key mới dán vào mục Đổi Riot Key!`
            : isKeyExpired
            ? `Riot Development API Key đã hết hạn (HTTP ${accountRes.status}). Hãy bấm "Đổi Riot Key" để dán key mới!`
            : `Không tìm thấy tài khoản Riot ID "${gameName}#${tagLine}" (HTTP ${accountRes.status}).`,
          keyExpired: isKeyExpired,
          details: errBody,
        },
        { status: accountRes.status }
      );
    }

    const accountData = await accountRes.json();
    const puuid: string = accountData.puuid;

    // Map queueFilter to Riot Match-V5 queue ID
    let riotQueueId: number | null = null;
    if (queueFilter === "ARAM" || queueFilter === "450") {
      riotQueueId = 450;
    } else if (queueFilter === "SOLO" || queueFilter === "420") {
      riotQueueId = 420;
    } else if (queueFilter === "FLEX" || queueFilter === "440") {
      riotQueueId = 440;
    } else if (queueFilter === "NORMAL" || queueFilter === "400") {
      riotQueueId = 400;
    }

    const buildIdsUrl = (qId: number | null, limit = count) => {
      const qParam = qId ? `&queue=${qId}` : "";
      return `https://${matchCluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
        puuid
      )}/ids?start=0&count=${limit}${qParam}`;
    };

    const idsRes = await fetch(buildIdsUrl(riotQueueId, count), {
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

    let matchIds: string[] = await idsRes.json();

    // If searching ARAM and queue=450 has fewer matches, also check Bridge of Progress ARAM (queue=2400)
    if (
      riotQueueId === 450 &&
      (!Array.isArray(matchIds) || matchIds.length < 3)
    ) {
      try {
        const aramBridgeRes = await fetch(buildIdsUrl(2400, count), {
          headers: { "X-Riot-Token": apiKey },
          cache: "no-store",
        });
        if (aramBridgeRes.ok) {
          const bridgeIds: string[] = await aramBridgeRes.json();
          if (Array.isArray(bridgeIds) && bridgeIds.length > 0) {
            matchIds = Array.from(
              new Set([...(matchIds || []), ...bridgeIds])
            ).slice(0, count);
          }
        }
      } catch {
        // Ignore fallback error
      }
    }

    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      const modeNameVi =
        riotQueueId === 450
          ? "chế độ ARAM (Vực Gió Hú)"
          : riotQueueId === 420
          ? "chế độ Xếp Hạng Đơn/Đôi"
          : riotQueueId === 440
          ? "chế độ Xếp Hạng Linh Hoạt"
          : "cụm máy chủ " + matchCluster.toUpperCase();

      return NextResponse.json(
        {
          error: `Tài khoản "${gameName}#${tagLine}" chưa có trận đấu nào gần đây ở ${modeNameVi}. Bạn có thể chuyển sang tab "Tất Cả Chế Độ" để xem toàn bộ lịch sử đấu!`,
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
      queueFilter,
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
