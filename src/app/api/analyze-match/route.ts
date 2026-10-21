import { NextRequest, NextResponse } from "next/server";
import {
  AiMatchAnalysisResult,
  LaneComparisonItem,
  NormalizedMatchData,
  ParticipantStats,
} from "@/types/match";
import { RoleId } from "@/data/champions";

const ROLES_LIST: RoleId[] = ["TOP", "JG", "MID", "AD", "SP"];

/**
 * Generates a structured AI coaching prompt from NormalizedMatchData
 */
export function buildAiPromptFromMatch(
  match: NormalizedMatchData,
  focusedParticipant: ParticipantStats
): string {
  const durationMin = (match.gameDurationSeconds / 60).toFixed(1);
  const formatTeam = (team: NormalizedMatchData["blueTeam"], label: string) => {
    const rows = team.participants
      .map(
        (p) =>
          `  - [${p.role}] ${p.riotIdGameName}#${p.riotIdTagline} (${p.championName}): KDA ${p.kills}/${p.deaths}/${p.assists} (${p.kda}), DMG ${p.totalDamageDealtToChampions.toLocaleString()} (${p.damageShare}%), Gold ${p.goldEarned.toLocaleString()}, CS ${p.cs} (${p.csPerMin}/m), Vision ${p.visionScore}, KP ${p.killParticipation}%`
      )
      .join("\n");
    return `${label} (${team.win ? "THẮNG" : "THUA"} | Kills: ${team.totalKills} | Gold: ${team.totalGold.toLocaleString()} | Baron: ${team.objectives.baron}, Rồng: ${team.objectives.dragon}, Sâu: ${team.objectives.horde}, Trụ: ${team.objectives.tower}):\n${rows}`;
  };

  return `Hãy phân tích chuyên sâu trận đấu Liên Minh Huyền Thoại sau bằng tiếng Việt:
- Mã trận: ${match.matchId} (${match.queueName})
- Thời lượng: ${durationMin} phút | Phiên bản: ${match.gameVersion}
- Người chơi trọng tâm cần đánh giá chi tiết: ${focusedParticipant.riotIdGameName}#${focusedParticipant.riotIdTagline} (${focusedParticipant.championName} - đường ${focusedParticipant.role})

${formatTeam(match.blueTeam, "ĐỘI XANH (BLUE TEAM)")}

${formatTeam(match.redTeam, "ĐỘI ĐỎ (RED TEAM)")}

Hãy trả về JSON đúng cấu trúc gồm:
{
  "overview": "Tóm tắt cục diện trận đấu 2-3 câu",
  "winConditionSummary": "Nguyên nhân chính dẫn đến chiến thắng/thất bại",
  "mvpPlayer": { "name": "...", "champion": "...", "role": "TOP|JG|MID|AD|SP", "reason": "..." },
  "svpPlayer": { "name": "...", "champion": "...", "role": "TOP|JG|MID|AD|SP", "reason": "..." },
  "focusedPlayerReview": {
    "playerName": "${focusedParticipant.riotIdGameName}",
    "champion": "${focusedParticipant.championName}",
    "role": "${focusedParticipant.role}",
    "grade": "S+|S|A|B|C",
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
    "weaknesses": ["Điểm cần khắc phục 1", "Điểm cần khắc phục 2"],
    "actionableAdvice": ["Lời khuyên cải thiện ván sau 1", "Lời khuyên 2", "Lời khuyên 3"]
  },
  "laneComparisons": [
    { "role": "TOP", "blueChampion": "...", "redChampion": "...", "winnerTeam": 100, "verdict": "..." }
  ],
  "macroInsights": ["Nhận xét Macro 1", "Nhận xét Macro 2", "Nhận xét Macro 3"]
}`;
}

/**
 * Generates an accurate tactical analysis directly from match metrics
 * (used when the user has not yet plugged in an external AI API URL, or as a fallback)
 */
function buildSmartAnalysisFromMatch(
  match: NormalizedMatchData,
  focused: ParticipantStats,
  endpointStatus: string
): AiMatchAnalysisResult {
  const winningTeam = match.blueTeam.win ? match.blueTeam : match.redTeam;
  const losingTeam = match.blueTeam.win ? match.redTeam : match.blueTeam;

  const mvp = [...winningTeam.participants].sort(
    (a, b) => b.mvpScore - a.mvpScore
  )[0];
  const svp = [...losingTeam.participants].sort(
    (a, b) => b.mvpScore - a.mvpScore
  )[0];

  const goldDiff = Math.abs(match.blueTeam.totalGold - match.redTeam.totalGold);
  const durationMin = Math.round(match.gameDurationSeconds / 60);

  const laneComparisons: LaneComparisonItem[] = ROLES_LIST.map((role) => {
    const blueP =
      match.blueTeam.participants.find((p) => p.role === role) ||
      match.blueTeam.participants[0];
    const redP =
      match.redTeam.participants.find((p) => p.role === role) ||
      match.redTeam.participants[0];

    const scoreDiff = blueP.mvpScore - redP.mvpScore;
    const goldGap = blueP.goldEarned - redP.goldEarned;
    const winnerTeam: 100 | 200 | "EVEN" =
      Math.abs(scoreDiff) < 4 ? "EVEN" : scoreDiff > 0 ? 100 : 200;

    const winnerP = winnerTeam === 100 ? blueP : redP;
    const loserP = winnerTeam === 100 ? redP : blueP;

    const verdict =
      winnerTeam === "EVEN"
        ? `Kèo đấu cân bằng giữa ${blueP.championName} và ${redP.championName}, chênh lệch vàng không đáng kể (${Math.abs(
            goldGap
          ).toLocaleString()} vàng).`
        : `${winnerP.championName} (${winnerP.riotIdGameName}) áp đảo ${
            loserP.championName
          } với KDA ${winnerP.kills}/${winnerP.deaths}/${
            winnerP.assists
          }, tạo chênh lệch +${Math.abs(
            goldGap
          ).toLocaleString()} vàng và đóng góp ${
            winnerP.killParticipation
          }% điểm hạ gục.`;

    return {
      role,
      blueChampion: blueP.championName,
      redChampion: redP.championName,
      winnerTeam,
      verdict,
    };
  });

  // Grade calculation for focused player
  const grade =
    focused.mvpScore >= 92
      ? "S+"
      : focused.mvpScore >= 84
      ? "S"
      : focused.mvpScore >= 74
      ? "A"
      : focused.mvpScore >= 62
      ? "B"
      : "C";

  const opponent = (
    focused.teamId === 100 ? match.redTeam : match.blueTeam
  ).participants.find((p) => p.role === focused.role);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionableAdvice: string[] = [];

  if (focused.killParticipation >= 60) {
    strengths.push(
      `Tỷ lệ tham gia hạ gục rất cao (${focused.killParticipation}%), luôn có mặt trong các pha giao tranh trọng yếu cùng đồng đội.`
    );
  }
  if (focused.damageShare >= 22) {
    strengths.push(
      `Đóng góp tới ${focused.damageShare}% tổng sát thương toàn đội (${focused.totalDamageDealtToChampions.toLocaleString()} DMG), hoàn thành xuất sắc vai trò nguồn sát thương.`
    );
  }
  if (focused.csPerMin >= 8.0 && focused.role !== "SP") {
    strengths.push(
      `Khả năng farm lính ổn định (${focused.csPerMin} CS/phút, tổng ${focused.cs} CS), duy trì lượng trang bị vượt trội theo thời gian.`
    );
  }
  if (focused.visionScore >= 45) {
    strengths.push(
      `Kiểm soát tầm nhìn ấn tượng với ${focused.visionScore} điểm tầm nhìn (${focused.wardsPlaced} mắt cắm, ${focused.wardsKilled} mắt phá).`
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      `Giữ vị trí và phối hợp giao tranh cùng đội hình với ${focused.assists} hỗ trợ và ${focused.totalDamageDealtToChampions.toLocaleString()} sát thương.`
    );
  }

  if (focused.deaths >= 6) {
    weaknesses.push(
      `Số lần nằm xuống khá cao (${focused.deaths} mạng), làm gián đoạn nhịp tăng tiến sức mạnh và nhường tài nguyên cho đối phương.`
    );
  }
  if (focused.role !== "SP" && focused.csPerMin < 7.0) {
    weaknesses.push(
      `Chỉ số lính (${focused.csPerMin} CS/phút) còn có thể tối ưu tốt hơn ở giai đoạn giữa trận khi di chuyển giữa các đường.`
    );
  }
  if (opponent && opponent.goldEarned > focused.goldEarned) {
    weaknesses.push(
      `Thua thiệt ${(
        opponent.goldEarned - focused.goldEarned
      ).toLocaleString()} vàng so với ${opponent.championName} đối diện ở đường ${
        focused.role
      }.`
    );
  }
  if (weaknesses.length === 0) {
    weaknesses.push(
      `Cần tận dụng lợi thế dẫn trước sớm hơn để ép giao tranh khu vực Hang Sứ Giả / Rồng nguyên tố cùng Rừng.`
    );
  }

  actionableAdvice.push(
    `Khi cầm ${focused.championName} đối đầu ${
      opponent?.championName || "đối phương"
    } ở đường ${
      focused.role
    }, hãy chủ động cắm mắt kiểm soát ở phút 3:00 - 3:30 để tránh nhịp gank đầu trận và giữ thế lính có lợi.`
  );
  actionableAdvice.push(
    `Tối ưu hóa nhịp biến về trước 45 giây khi Rồng hoặc Baron xuất hiện để sử dụng lượng vàng (${focused.goldEarned.toLocaleString()} vàng) chuyển hóa thành ngưỡng sức mạnh trang bị.`
  );
  actionableAdvice.push(
    `Trong giao tranh tổng sau phút 20, ưu tiên phối hợp chuỗi khống chế cùng tuyến trước và theo dõi kỹ phép bổ trợ Tốc Biến của chủ lực đối phương.`
  );

  return {
    overview: `Trận đấu kéo dài ${durationMin} phút với chiến thắng thuộc về ${
      match.blueTeam.win ? "Đội Xanh (Blue)" : "Đội Đỏ (Red)"
    } cùng tỷ số hạ gục ${winningTeam.totalKills} - ${
      losingTeam.totalKills
    } và chênh lệch ${goldDiff.toLocaleString()} vàng. ${
      winningTeam.participants[0].teamId === 100 ? "Đội Xanh" : "Đội Đỏ"
    } kiểm soát hoàn toàn các mục tiêu lớn với ${
      winningTeam.objectives.dragon
    } Rồng nguyên tố và ${winningTeam.objectives.baron} bùa lợi Baron.`,
    winConditionSummary: `Chìa khóa chiến thắng đến từ khả năng tạo áp lực liên tục của ${mvp.championName} (${mvp.riotIdGameName}) với ${mvp.killParticipation}% tham gia hạ gục, kết hợp cùng kiểm soát tầm nhìn vượt trội giúp ăn trọn ${winningTeam.objectives.baron} Baron và phá hủy ${winningTeam.objectives.tower} trụ bảo vệ.`,
    mvpPlayer: {
      name: `${mvp.riotIdGameName}#${mvp.riotIdTagline}`,
      champion: mvp.championName,
      role: mvp.role,
      reason: `Đạt điểm MVP ${mvp.mvpScore} với KDA ${mvp.kills}/${mvp.deaths}/${mvp.assists}, tham gia ${mvp.killParticipation}% mạng hạ gục và dẫn dắt nhịp độ trận đấu.`,
    },
    svpPlayer: {
      name: `${svp.riotIdGameName}#${svp.riotIdTagline}`,
      champion: svp.championName,
      role: svp.role,
      reason: `Nỗ lực gánh đội nổi bật nhất bên phía đội thua (SVP ${svp.mvpScore}) với ${svp.damageShare}% tỷ lệ sát thương toàn đội (${svp.totalDamageDealtToChampions.toLocaleString()} DMG).`,
    },
    focusedPlayerReview: {
      playerName: `${focused.riotIdGameName}#${focused.riotIdTagline}`,
      champion: focused.championName,
      role: focused.role,
      grade,
      strengths,
      weaknesses,
      actionableAdvice,
    },
    laneComparisons,
    macroInsights: [
      `Kiểm soát mục tiêu lớn: Đội thắng sở hữu ${winningTeam.objectives.dragon} Rồng và ${winningTeam.objectives.baron} Baron so với ${losingTeam.objectives.dragon} Rồng của đối phương — tạo áp lực lính siêu cấp lên ${winningTeam.objectives.inhibitor} đường.`,
      `Chênh lệch tài nguyên: Khoảng cách ${goldDiff.toLocaleString()} vàng (${winningTeam.totalGold.toLocaleString()} vs ${losingTeam.totalGold.toLocaleString()}) giúp đội thắng vượt trội hoàn toàn từ ngưỡng trang bị thứ 3.`,
      `Kiểm soát bản đồ: Tổng điểm tầm nhìn của Đội Xanh là ${match.blueTeam.participants.reduce(
        (s, p) => s + p.visionScore,
        0
      )} so với ${match.redTeam.participants.reduce(
        (s, p) => s + p.visionScore,
        0
      )} của Đội Đỏ.`,
    ],
    usedEndpoint: endpointStatus,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const match: NormalizedMatchData = body.match;
    const focusPuuid: string | undefined = body.focusPuuid;

    // Allow custom AI API URL & Key from request body OR environment variables
    // Default to bot-summary local endpoint http://localhost:5555/api/analyze-lol-match
    const aiApiUrl: string =
      body.customAiUrl?.trim() ||
      process.env.AI_ANALYSIS_API_URL?.trim() ||
      "http://localhost:5555/api/analyze-lol-match";
    const aiApiKey: string =
      body.customAiKey?.trim() || process.env.AI_ANALYSIS_API_KEY?.trim() || "";
    const aiModel: string =
      body.customAiModel?.trim() ||
      process.env.AI_ANALYSIS_MODEL?.trim() ||
      "llama-3.3-70b-versatile";

    if (!match || !match.blueTeam || !match.redTeam) {
      return NextResponse.json(
        { error: "Dữ liệu trận đấu (match) không hợp lệ." },
        { status: 400 }
      );
    }

    const allParticipants = [
      ...match.blueTeam.participants,
      ...match.redTeam.participants,
    ];
    const focusedParticipant =
      allParticipants.find((p) => p.puuid === focusPuuid) ||
      allParticipants[0];

    const prompt = buildAiPromptFromMatch(match, focusedParticipant);

    // If the user has provided an external AI API URL, call it!
    if (aiApiUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (aiApiKey) {
        headers["Authorization"] = aiApiKey.startsWith("Bearer ")
          ? aiApiKey
          : `Bearer ${aiApiKey}`;
        headers["x-api-key"] = aiApiKey;
      }

      const isOpenAiChatFormat = aiApiUrl.includes("/chat/completions");

      const outboundPayload = isOpenAiChatFormat
        ? {
            model: aiModel,
            messages: [
              {
                role: "system",
                content:
                  "Bạn là Huấn luyện viên & Chuyên gia phân tích dữ liệu Liên Minh Huyền Thoại cấp độ Thách Đấu. Luôn trả về kết quả JSON hợp lệ theo đúng schema được yêu cầu.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.4,
            response_format: { type: "json_object" },
          }
        : {
            // Standard payload for custom AI analysis API
            match,
            focusedPlayer: focusedParticipant,
            prompt,
            model: aiModel,
          };

      try {
        const aiRes = await fetch(aiApiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(outboundPayload),
          cache: "no-store",
        });

        if (aiRes.ok) {
          const rawJson = await aiRes.json();

          // Extract either OpenAI choices[0].message.content or bot-summary analysis field
          let parsedAnalysis: Partial<AiMatchAnalysisResult> | null = null;
          let rawTextOutput: string | undefined;

          const contentCandidate =
            rawJson?.choices?.[0]?.message?.content ??
            rawJson?.analysis ??
            rawJson?.data ??
            rawJson?.result ??
            rawJson;

          if (typeof contentCandidate === "string") {
            rawTextOutput = contentCandidate;
            try {
              const cleaned = contentCandidate
                .replace(/^```json\s*/i, "")
                .replace(/```$/i, "")
                .trim();
              parsedAnalysis = JSON.parse(cleaned);
            } catch {
              parsedAnalysis = null;
            }
          } else if (
            contentCandidate &&
            typeof contentCandidate === "object"
          ) {
            parsedAnalysis = contentCandidate as Partial<AiMatchAnalysisResult>;
          }

          const fallbackBase = buildSmartAnalysisFromMatch(
            match,
            focusedParticipant,
            `bot-summary API (${aiApiUrl})`
          );

          const mergedResult: AiMatchAnalysisResult = {
            ...fallbackBase,
            ...(parsedAnalysis || {}),
            overview:
              parsedAnalysis?.overview ||
              rawTextOutput ||
              fallbackBase.overview,
            rawAiResponse:
              rawTextOutput || JSON.stringify(rawJson, null, 2),
            usedEndpoint:
              parsedAnalysis?.usedEndpoint || `bot-summary API (${aiApiUrl})`,
          };

          return NextResponse.json({
            analysis: mergedResult,
            sentPayloadPreview: outboundPayload,
          });
        }
      } catch {
        // Fallback if bot-summary server is offline
      }
    }

    // Default: Built-in Tactical AI Engine + full preview of the payload ready for the user's AI API
    const analysis = buildSmartAnalysisFromMatch(
      match,
      focusedParticipant,
      "Built-in Tactical Analyzer (Sẵn sàng nối API AI của bạn qua /api/analyze-match)"
    );

    return NextResponse.json({
      analysis,
      sentPayloadPreview: {
        matchId: match.matchId,
        focusedPlayer: `${focusedParticipant.riotIdGameName}#${focusedParticipant.riotIdTagline} (${focusedParticipant.championName} - ${focusedParticipant.role})`,
        promptPreview: prompt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Lỗi khi xử lý phân tích trận đấu bằng AI.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
