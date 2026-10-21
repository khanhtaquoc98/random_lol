import { NextRequest, NextResponse } from "next/server";
import {
  AiMatchAnalysisResult,
  LaneComparisonItem,
  NormalizedMatchData,
  ParticipantStats,
  PlayerReviewItem,
} from "@/types/match";
import { RoleId } from "@/data/champions";

const ROLES_LIST: RoleId[] = ["TOP", "JG", "MID", "AD", "SP"];

const ROLE_VI_NAME: Record<RoleId, string> = {
  TOP: "đường trên",
  JG: "đi rừng",
  MID: "đường giữa",
  AD: "xạ thủ đường dưới",
  SP: "hỗ trợ",
};

const ROLE_ARCHETYPE_VI: Record<RoleId, string> = {
  TOP: "đấu sĩ / tiên phong đường trên",
  JG: "người đi rừng kiểm soát nhịp độ",
  MID: "chủ lực đường giữa",
  AD: "xạ thủ chủ lực",
  SP: "hỗ trợ kiểm soát tầm nhìn & mở giao tranh",
};

/**
 * Honest, metric-driven fallback player review when LLM is unreachable
 */
function buildSinglePlayerReview(
  match: NormalizedMatchData,
  focused: ParticipantStats
): PlayerReviewItem {
  const durationMin = Math.max(1, Math.round(match.gameDurationSeconds / 60));
  const grade =
    focused.mvpScore >= 90
      ? "S+"
      : focused.mvpScore >= 82
      ? "S"
      : focused.mvpScore >= 72
      ? "A"
      : focused.mvpScore >= 60
      ? "B"
      : "C";

  const playerTeam = focused.teamId === 100 ? match.blueTeam : match.redTeam;
  const enemyTeam = focused.teamId === 100 ? match.redTeam : match.blueTeam;
  const allParticipants = [
    ...match.blueTeam.participants,
    ...match.redTeam.participants,
  ];
  const opponent = enemyTeam.participants.find((p) => p.role === focused.role);

  const teamByDmg = [...playerTeam.participants].sort(
    (a, b) => b.totalDamageDealtToChampions - a.totalDamageDealtToChampions
  );
  const matchByDmg = [...allParticipants].sort(
    (a, b) => b.totalDamageDealtToChampions - a.totalDamageDealtToChampions
  );
  const teamByTaken = [...playerTeam.participants].sort(
    (a, b) => b.totalDamageTaken - a.totalDamageTaken
  );

  const dmgRankInTeam =
    teamByDmg.findIndex((p) => p.puuid === focused.puuid) + 1;
  const dmgRankInMatch =
    matchByDmg.findIndex((p) => p.puuid === focused.puuid) + 1;
  const takenRankInTeam =
    teamByTaken.findIndex((p) => p.puuid === focused.puuid) + 1;

  const fullTag = `${focused.riotIdGameName}#${focused.riotIdTagline}`;
  const isAram =
    match.gameMode === "ARAM" ||
    match.queueName.toUpperCase().includes("ARAM");
  const roleVi = isAram
    ? "đấu trường Vực Gió Hú (ARAM)"
    : ROLE_VI_NAME[focused.role] || focused.role;
  const archetypeVi = ROLE_ARCHETYPE_VI[focused.role] || "người chơi chủ chốt";
  const kdaFormatted = Number(focused.kda).toFixed(2);
  const controlWards = focused.visionWardsBoughtInGame ?? 0;

  const goldDiffVsOpp = opponent
    ? focused.goldEarned - opponent.goldEarned
    : 0;
  const dmgDiffVsOpp = opponent
    ? focused.totalDamageDealtToChampions -
      opponent.totalDamageDealtToChampions
    : 0;
  const csDiffVsOpp = opponent ? focused.cs - opponent.cs : 0;

  let summary = "";
  if (focused.win) {
    if (focused.kda >= 3.0 || focused.mvpScore >= 80) {
      summary = `Cầm ${focused.championName} (${focused.primaryRune}) ở vị trí ${roleVi}, ${fullTag} thi đấu bùng nổ với KDA ${focused.kills}/${focused.deaths}/${focused.assists} (${kdaFormatted}) và đóng góp trực tiếp vào chiến thắng của đội.`;
    } else if (focused.deaths >= 7) {
      summary = `Dù giành chiến thắng cùng toàn đội nhưng ${fullTag} (${focused.championName} - ${roleVi}) đã có một ván đấu khá vất vả khi phải nằm xuống ${focused.deaths} lần trước sức ép của ${opponent?.championName || "đối phương"}.`;
    } else {
      summary = `Trong trận đấu này, ${fullTag} đã hoàn thành tròn vai nhiệm vụ của ${focused.championName} ở ${roleVi}, phối hợp tốt cùng đồng đội để mang về chiến thắng chung cuộc.`;
    }
  } else {
    if (dmgRankInTeam === 1 && focused.kda >= 2.2) {
      summary = `Dù đội nhà thất bại, ${fullTag} (${focused.championName} - ${roleVi}) vẫn là điểm sáng lớn nhất khi gánh ${focused.damageShare}% sát thương toàn đội (${focused.totalDamageDealtToChampions.toLocaleString()} DMG) với KDA ${focused.kills}/${focused.deaths}/${focused.assists}.`;
    } else if (dmgRankInTeam <= 2 && focused.deaths >= 7) {
      summary = `Cầm ${focused.championName} ở ${roleVi}, ${fullTag} rất nỗ lực gây sát thương (${focused.totalDamageDealtToChampions.toLocaleString()} DMG - hạng ${dmgRankInTeam} toàn đội) nhưng việc nằm xuống tới ${focused.deaths} lần khiến bạn mất nhịp kiểm soát thế trận.`;
    } else {
      summary = `Trong ván đấu này, ${fullTag} với vị tướng ${focused.championName} ở ${roleVi} gặp rất nhiều áp lực từ kèo đấu với ${opponent?.championName || "đối phương"} (KDA ${focused.kills}/${focused.deaths}/${focused.assists}) và chưa thể lật ngược thế cờ.`;
    }
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionableAdvice: string[] = [];

  // 1. Honest Strengths Analysis
  if (dmgRankInMatch === 1) {
    strengths.push(
      `Dẫn đầu toàn bộ trận đấu về lượng sát thương lên tướng địch với ${focused.totalDamageDealtToChampions.toLocaleString()} DMG (chiếm ${focused.damageShare}% tổng sát thương của đội).`
    );
  } else if (dmgRankInTeam === 1) {
    strengths.push(
      `Là ngòi nổ sát thương số 1 của đội hình với ${focused.totalDamageDealtToChampions.toLocaleString()} sát thương lên tướng địch (chiếm ${focused.damageShare}% toàn đội${
        dmgDiffVsOpp > 0 && opponent
          ? `, nhiều hơn đối thủ cùng đường ${opponent.championName} tới +${dmgDiffVsOpp.toLocaleString()} sát thương`
          : ""
      }).`
    );
  } else if (dmgDiffVsOpp > 1500 && opponent) {
    strengths.push(
      `Gây áp lực trao đổi chiêu thức vượt trội trước ${opponent.championName} cùng đường khi gây ${focused.totalDamageDealtToChampions.toLocaleString()} sát thương (hơn đối thủ +${dmgDiffVsOpp.toLocaleString()} DMG).`
    );
  } else if (takenRankInTeam === 1) {
    strengths.push(
      `Đóng vai trò lá chắn tuyến đầu cho toàn đội khi hứng chịu tới ${focused.totalDamageTaken.toLocaleString()} sát thương (cao nhất đội), tạo khoảng trống cho tuyến sau xả sát thương.`
    );
  }

  if (focused.kda >= 3.0) {
    strengths.push(
      `Giữ vị trí và chọn thời điểm giao tranh sắc bén với KDA ấn tượng ${kdaFormatted} (${focused.kills}/${focused.deaths}/${focused.assists}) cùng ${focused.killParticipation}% tỷ lệ tham gia hạ gục.`
    );
  } else if (focused.killParticipation >= 55) {
    strengths.push(
      `Tích cực di chuyển hỗ trợ đồng đội với tỷ lệ tham gia hạ gục đạt ${focused.killParticipation}% (${focused.kills} mạng hạ gục, ${focused.assists} hỗ trợ).`
    );
  } else if (focused.kills >= 6) {
    strengths.push(
      `Khả năng dứt điểm mục tiêu tốt với ${focused.kills} điểm hạ gục mang về (chuỗi hạ gục lớn nhất đạt ${focused.largestKillingSpree ?? 2}).`
    );
  }

  if (goldDiffVsOpp >= 600 && opponent) {
    strengths.push(
      `Thắng kèo kinh tế trực tiếp trước ${opponent.championName} cùng đường với khoảng cách +${goldDiffVsOpp.toLocaleString()} vàng (${focused.goldEarned.toLocaleString()} vs ${opponent.goldEarned.toLocaleString()}) và ${focused.cs} chỉ số lính.`
    );
  } else if (focused.role !== "SP" && focused.csPerMin >= 6.8) {
    strengths.push(
      `Duy trì nhịp độ farm lính ổn định với ${focused.cs} CS (${focused.csPerMin} lính/phút), tích lũy ${focused.goldEarned.toLocaleString()} vàng để đảm bảo ngưỡng sức mạnh trang bị.`
    );
  } else if ((focused.damageDealtToTurrets ?? 0) >= 3500) {
    strengths.push(
      `Tạo áp lực đẩy đường và công phá công trình mạnh mẽ với ${(focused.damageDealtToTurrets ?? 0).toLocaleString()} sát thương gây lên trụ địch.`
    );
  } else if (focused.visionScore >= 25 || controlWards >= 2) {
    strengths.push(
      `Đóng góp tích cực vào kiểm soát tầm nhìn bản đồ với ${focused.visionScore} điểm tầm nhìn (cắm ${focused.wardsPlaced} mắt, mua ${controlWards} Mắt kiểm soát, phá ${focused.wardsKilled} mắt địch).`
    );
  }

  if (strengths.length === 0) {
    strengths.push(
      `Nỗ lực bám trụ giao tranh với ${focused.totalDamageDealtToChampions.toLocaleString()} sát thương gây ra (${focused.damageShare}% đội) và ${focused.totalDamageTaken.toLocaleString()} sát thương chống chịu trong thế trận khó khăn.`
    );
  }

  // 2. Honest Weaknesses Analysis
  if (focused.deaths >= 7) {
    weaknesses.push(
      `Nằm xuống quá nhiều (${focused.deaths} lần bị hạ gục - trung bình mỗi ${(durationMin / focused.deaths).toFixed(1)} phút chết 1 lần), làm đứt quãng thời gian có mặt trên bản đồ và trao nhiều vàng thưởng cho đối phương.`
    );
  } else if (focused.deaths >= 5 && focused.kda < 2.0) {
    weaknesses.push(
      `Hiệu suất sinh tồn chưa cao với ${focused.deaths} lần nằm xuống (KDA ${kdaFormatted}), thường xuyên bị bắt lẻ hoặc thất thế trong các pha giao tranh nhỏ lẻ.`
    );
  }

  if (goldDiffVsOpp <= -800 && opponent) {
    weaknesses.push(
      `Thua thiệt rõ rệt trong kèo đối đầu với ${opponent.championName} khi bị dẫn trước ${Math.abs(goldDiffVsOpp).toLocaleString()} vàng (${focused.goldEarned.toLocaleString()} so với ${opponent.goldEarned.toLocaleString()})${
        !isAram && csDiffVsOpp < -15
          ? ` và kém ${Math.abs(csDiffVsOpp)} chỉ số lính`
          : ""
      }.`
    );
  } else if (
    !isAram &&
    focused.role !== "SP" &&
    focused.role !== "JG" &&
    focused.csPerMin < 5.8
  ) {
    weaknesses.push(
      `Chỉ số lính còn thấp so với tiêu chuẩn đường đơn/xạ thủ: chỉ đạt ${focused.cs} lính sau ${durationMin} phút (${focused.csPerMin} CS/phút), khiến tiến độ hoàn thành trang bị lớn bị chậm lại.`
    );
  } else if (!isAram && focused.role === "JG" && focused.csPerMin < 5.0) {
    weaknesses.push(
      `Vòng rừng chưa tối ưu khi chỉ đạt ${focused.cs} quái rừng (${focused.csPerMin} CS/phút), dẫn đến thọt cấp độ và lượng vàng so với nhịp độ trận đấu.`
    );
  }

  if (!isAram && controlWards === 0) {
    weaknesses.push(
      `Không mua bất kỳ Mắt kiểm soát (mắt tím) nào trong suốt ${durationMin} phút thi đấu, khiến khu vực đường ${roleVi} và sông thiếu tầm nhìn bảo vệ trước các pha gank.`
    );
  }

  if (focused.killParticipation < (isAram ? 60 : 40)) {
    weaknesses.push(
      `Tỷ lệ tham gia giao tranh cùng đồng đội còn thấp (KP chỉ đạt ${focused.killParticipation}%), thiếu sự gắn kết trong các pha giao tranh tổng.`
    );
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      isAram
        ? `Dù có chỉ số KDA đẹp (${focused.kills}/${focused.deaths}/${focused.assists}), trong chế độ ARAM bạn cần chủ động chọn thời điểm nằm xuống hợp lý (Reset timing) khi tích nhiều vàng để sớm mua trang bị lớn trước pha giao tranh quyết định.`
        : `Dù có chỉ số cá nhân đẹp (${focused.kills}/${focused.deaths}/${focused.assists}), bạn vẫn có thể tận dụng lợi thế sớm để đảo đường hỗ trợ đồng đội và ép trụ mạnh tay hơn.`
    );
  }

  // 3. Specific Actionable Advice
  if (isAram) {
    actionableAdvice.push(
      `Trong chế độ ARAM (Vực Gió Hú) với ${focused.championName}, hãy tận dụng tối đa bụi cỏ giữa cầu, căn chuẩn thời gian hồi Di vật máu (Health Relic) và phối hợp phép bổ trợ Đánh Dấu (Cầu Tuyết) cùng đồng đội để dồn sát thương mục tiêu chủ lực.`
    );
    actionableAdvice.push(
      `Khi cầm nhiều hơn 2,500 vàng trong người mà máu đã thấp, hãy chủ động đẩy cao đợt lính rồi nằm xuống hợp lý để mua trang bị hoàn chỉnh thay vì đứng lại giữ KDA nhưng thiếu sát thương trong pha combat tiếp theo.`
    );
  } else {
    if (focused.deaths >= 6 && opponent) {
      actionableAdvice.push(
        `Trong kèo ${focused.championName} đối đầu ${opponent.championName} ở ${roleVi}, khi đã bị dẫn trang bị hoặc mất Tốc Biến, hãy chủ động đóng băng lính gần trụ nhà và chờ rừng hỗ trợ thay vì cố lao lên trao đổi chiêu thức dài hơi.`
      );
    } else if (goldDiffVsOpp < -600 && opponent) {
      actionableAdvice.push(
        `Khi cầm ${focused.championName} gặp kèo khó như ${opponent.championName}, hãy ưu tiên lên sớm trang bị phòng ngự/giày phù hợp và tận dụng kỹ năng để dọn lính an toàn, tránh mất máu quá nhiều trước khi mục tiêu lớn xuất hiện.`
      );
    } else {
      actionableAdvice.push(
        `Với chất tướng ${archetypeVi} của ${focused.championName} (${focused.primaryRune}), hãy tận dụng ngưỡng sức mạnh khi hoàn thành món trang bị thứ 2 để chủ động ép giao tranh tại hang Rồng/Baron.`
      );
    }

    if (controlWards === 0) {
      actionableAdvice.push(
        `Hãy tập thói quen mua từ 1-2 Mắt kiểm soát mỗi lần biến về khi dư 75 vàng để kiểm soát bụi cỏ sông/bùa lợi, giúp ${focused.championName} đẩy đường hoặc bắt lẻ an toàn hơn.`
      );
    } else {
      actionableAdvice.push(
        `Tiếp tục duy trì thói quen kiểm soát tầm nhìn (${focused.visionScore} điểm) và chủ động ping kêu gọi đồng đội thiết lập thế trận trước khi Rồng/Baron ra mắt 45 giây.`
      );
    }
  }

  return {
    puuid: focused.puuid,
    teamId: focused.teamId,
    playerName: fullTag,
    championId: focused.championId,
    champion: focused.championName,
    role: focused.role,
    win: focused.win,
    kdaText: `${focused.kills}/${focused.deaths}/${focused.assists} (${kdaFormatted} KDA)`,
    mvpScore: focused.mvpScore,
    grade,
    summary,
    strengths,
    weaknesses,
    actionableAdvice,
  };
}

/**
 * Builds a rich, comprehensive prompt for Groq LLM (llama-3.3-70b-versatile)
 * to deeply analyze ALL 10 players and all 5 lane matchups with true LoL tactical insight.
 */
function buildAiPromptForAll10Players(match: NormalizedMatchData): string {
  const durationMin = (match.gameDurationSeconds / 60).toFixed(1);
  const isAram =
    match.gameMode === "ARAM" ||
    match.queueName.toUpperCase().includes("ARAM");
  const aramNote = isAram
    ? `\n- LƯU Ý ĐẶC BIỆT (CHẾ ĐỘ ARAM - VỰC GIÓ HÚ 5v5 1 ĐƯỜNG DUY NHẤT): Bản đồ này KHÔNG có Rồng/Baron/Rừng và KHÔNG có Mắt kiểm soát (điểm tầm nhìn = 0 là hoàn toàn bình thường, tuyệt đối KHÔNG phê bình người chơi thiếu mắt hay không cắm mắt). Hãy phân tích theo đúng chuẩn chiến thuật ARAM: tương quan đội hình Cấu rỉa (Poke) vs Mở giao tranh (Engage/Cầu Tuyết Mark-Dash), kiểm soát bụi cỏ giữa cầu & Di vật máu (Health Relics), khả năng dọn lính giữ trụ và chọn thời điểm nằm xuống hợp lý (Reset timing) để tiêu vàng lên trang bị lớn.`
    : "";

  const laneBlocks = ROLES_LIST.map((role) => {
    const bp = match.blueTeam.participants.find((p) => p.role === role);
    const rp = match.redTeam.participants.find((p) => p.role === role);
    if (!bp || !rp) return "";

    const goldDiff = bp.goldEarned - rp.goldEarned;
    const dmgDiff =
      bp.totalDamageDealtToChampions - rp.totalDamageDealtToChampions;
    const csDiff = bp.cs - rp.cs;

    const formatP = (p: ParticipantStats, teamLabel: string) =>
      `    * [${teamLabel} - puuid="${p.puuid}"] ${p.riotIdGameName}#${p.riotIdTagline} | Tướng: ${p.championName} (Cấp ${p.champLevel}, Ngọc: ${p.primaryRune}) | Kết quả: ${
        p.win ? "THẮNG" : "THUA"
      } | KDA: ${p.kills}/${p.deaths}/${p.assists} (${Number(p.kda).toFixed(
        2
      )}) | KP: ${p.killParticipation}% | Chuỗi hạ gục: ${
        p.largestKillingSpree ?? 0
      } | Sát thương tướng: ${p.totalDamageDealtToChampions} (${
        p.damageShare
      }% đội) | Chống chịu: ${p.totalDamageTaken} | Sát thương trụ: ${
        p.damageDealtToTurrets ?? 0
      } | Vàng: ${p.goldEarned} | Lính CS: ${p.cs} (${
        p.csPerMin
      }/phút) | Tầm nhìn: ${p.visionScore} (Cắm ${p.wardsPlaced}, Phá ${
        p.wardsKilled
      }, Mua ${p.visionWardsBoughtInGame ?? 0} Mắt tím) | Điểm OP: ${
        p.mvpScore
      }`;

    return `=== ĐƯỜNG ${role} (${ROLE_VI_NAME[role].toUpperCase()}) | Chênh lệch Đội Xanh so với Đội Đỏ: Vàng ${
      goldDiff >= 0 ? `+${goldDiff}` : goldDiff
    }, Sát thương ${dmgDiff >= 0 ? `+${dmgDiff}` : dmgDiff}, Lính ${
      csDiff >= 0 ? `+${csDiff}` : csDiff
    } ===\n${formatP(bp, "ĐỘI XANH 100")}\n${formatP(rp, "ĐỘI ĐỎ 200")}`;
  }).join("\n\n");

  return `# VAI TRÒ CỦA BẠN
Bạn là Huấn luyện viên trưởng (Head Coach - HLV) chuyên nghiệp cấp độ LCK / Thách Đấu Liên Minh Huyền Thoại đang mổ băng (VOD Review) sau trận đấu.
Hãy phân tích chuyên sâu ván đấu dưới đây bằng tiếng Việt chuẩn thuật ngữ LMHT chuyên nghiệp (prio đường, nhịp biến về, thế lính slow-push/freeze, kiểm soát bụi cỏ, chiêu thức Q/W/E/R, ngưỡng sức mạnh trang bị, điều kiện thắng giao tranh 5v5) và trả về DUY NHẤT 1 đối tượng JSON hợp lệ.

# THÔNG TIN TRẬN ĐẤU
- Mã trận: ${match.matchId} (${match.queueName}) | Chế độ: ${isAram ? "ARAM - Vực Gió Hú (1 đường 5v5)" : match.gameMode} | Thời lượng: ${durationMin} phút | Phiên bản: ${match.gameVersion}${aramNote}
- ĐỘI XANH (teamId 100 - ${match.blueTeam.win ? "CHIẾN THẮNG" : "THẤT BẠI"}): Tổng mạng ${match.blueTeam.totalKills}, Tổng vàng ${match.blueTeam.totalGold}, Baron ${match.blueTeam.objectives.baron}, Rồng ${match.blueTeam.objectives.dragon}, Sâu Hư Không ${match.blueTeam.objectives.horde}, Trụ ${match.blueTeam.objectives.tower}.
- ĐỘI ĐỎ (teamId 200 - ${match.redTeam.win ? "CHIẾN THẮNG" : "THẤT BẠI"}): Tổng mạng ${match.redTeam.totalKills}, Tổng vàng ${match.redTeam.totalGold}, Baron ${match.redTeam.objectives.baron}, Rồng ${match.redTeam.objectives.dragon}, Sâu Hư Không ${match.redTeam.objectives.horde}, Trụ ${match.redTeam.objectives.tower}.

# DỮ LIỆU CHI TIẾT 5 CẶP ĐỐI ĐẦU CÙNG ĐƯỜNG (10 NGƯỜI CHƠI)
${laneBlocks}

# NGUYÊN TẮC MỔ BĂNG CỦA HLV TRƯỞNG (CỰC KỲ QUAN TRỌNG)
1. **TUYỆT ĐỐI CẤM VĂN MẪU LẶP LẠI GIỮA 10 NGƯỜI CHƠI**:
   - CẤM mở đầu câu bằng các cụm từ giống nhau như "Trong trận đấu này...", "Bạn kiểm soát tài nguyên rất tốt...", "Mặc dù là người chơi xuất sắc...".
   - Mỗi người chơi trong 10 người PHẢI có giọng văn nhận xét hoàn toàn khác nhau, đi thẳng vào **chất tướng & bộ kỹ năng đặc trưng (Q/W/E/R)**, **ngọc bổ trợ** và **tương tác kèo đấu 1v1 / 2v2 trực tiếp với đối thủ cùng đường** (ví dụ: cách Sett dùng Cuồng Thú Quyền W trả sát thương trước Cho'Gath tích Đại Tiệc R; cách Lee Sin tận dụng Sóng Âm Q1-Q2 cướp mục tiêu trước Dr. Mundo; cách Sylas cướp chiêu cuối; cách Pyke rình rập dùng Tử Thần Đáy Sâu R so với Senna tích Sương Đen...).
2. **ĐỌC SỐ LIỆU NHƯ MỘT HLV THỰC THỤ**:
   - Đánh giá đúng bản chất từng vai trò: Đấu sĩ/Đỡ đòn nhìn vào sát thương gánh chịu + khả năng mở giao tranh/càn lướt tuyến đầu; Rừng nhìn vào KP%, kiểm soát Sâu Hư Không/Rồng/Baron và nhịp gank; Mid/AD nhìn vào DPM (sát thương/phút), CS/phút, chênh lệch vàng và giữ vị trí (số lần chết); SP nhìn vào điểm tầm nhìn, mắt tím đã mua, phá mắt và bảo kê/mở combat.
   - Trung thực và thẳng thắn: Nếu người chơi nằm xuống nhiều (deaths >= 6) hoặc thua đường nặng về vàng/CS, hãy chỉ rõ nguyên nhân chiến thuật (bị bắt lẻ khi đẩy lẻ không tầm nhìn, trao đổi chiêu thức lỗi ở cấp độ đầu, hoặc thiếu góc đứng an toàn trong giao tranh) thay vì khen chung chung.
3. **ĐẦY ĐỦ 10 NGƯỜI CHƠI TRONG "allPlayerReviews"**:
   - Mảng "allPlayerReviews" BẮT BUỘC phải chứa đủ 10 phần tử tương ứng chính xác với 10 \`puuid\` ở trên.

# CẤU TRÚC JSON ĐẦU RA BẮT BUỘC
{
  "overview": "2-3 câu mổ băng sắc sảo về cục diện trận đấu, thế trận 3 đường, nhịp kiểm soát mục tiêu lớn và khoảnh khắc bước ngoặt định đoạt ván đấu",
  "winConditionSummary": "Phân tích chuẩn xác điều kiện thắng (Win Condition) mà đội thắng đã vận hành thành công và sai lầm chí mạng khiến đội thua sụp đổ",
  "mvpPlayer": {
    "name": "Tên#Tag của MVP đội thắng",
    "champion": "Tên tướng MVP",
    "role": "TOP|JG|MID|AD|SP",
    "reason": "Phân tích thuyết phục chuẩn HLV về tầm ảnh hưởng, kỹ năng chất tướng và số liệu KDA, sát thương, KP giúp dẫn dắt toàn đội"
  },
  "svpPlayer": {
    "name": "Tên#Tag của SVP đội thua",
    "champion": "Tên tướng SVP",
    "role": "TOP|JG|MID|AD|SP",
    "reason": "Phân tích nỗ lực gánh đội nổi bật nhất bên đội thua kèm số liệu thực tế"
  },
  "laneComparisons": [
    {
      "role": "TOP",
      "blueChampion": "Tên tướng TOP đội xanh",
      "redChampion": "Tên tướng TOP đội đỏ",
      "winnerTeam": 100,
      "verdict": "Mổ băng kèo đối đầu TOP: Phân tích tương tác kỹ năng giữa 2 tướng, ai thắng prio đường, chênh lệch vàng/sát thương/CS và hệ quả lên ván đấu"
    },
    { "role": "JG", "blueChampion": "...", "redChampion": "...", "winnerTeam": 200, "verdict": "..." },
    { "role": "MID", "blueChampion": "...", "redChampion": "...", "winnerTeam": 100, "verdict": "..." },
    { "role": "AD", "blueChampion": "...", "redChampion": "...", "winnerTeam": 200, "verdict": "..." },
    { "role": "SP", "blueChampion": "...", "redChampion": "...", "winnerTeam": 200, "verdict": "..." }
  ],
  "macroInsights": [
    "Góc nhìn HLV về kiểm soát mục tiêu lớn (Rồng, Baron, Sâu Hư Không) và thiết lập thế trận trước giờ mục tiêu ra mắt",
    "Góc nhìn HLV về khả năng chuyển hóa lợi thế đi đường thành trụ ngoài, kiểm soát rừng đối phương và nhịp độ lăn cầu tuyết",
    "Góc nhìn HLV về bài toán kiểm soát tầm nhìn (Mắt tím/Phá mắt) và cách vận hành đội hình trong giao tranh tổng 5v5"
  ],
  "allPlayerReviews": [
    {
      "puuid": "puuid chính xác của người chơi",
      "playerName": "Tên#Tag",
      "champion": "Tên tướng",
      "role": "TOP|JG|MID|AD|SP",
      "grade": "S+|S|A|B|C",
      "summary": "Nhận xét tổng quan sắc bén, mang đậm chất HLV chuyên nghiệp, đi thẳng vào lối chơi của vị tướng này trong trận (KHÔNG dùng mẫu câu lặp lại với người chơi khác)",
      "strengths": [
        "Điểm sáng chuyên môn 1: Phân tích cách phát huy bộ kỹ năng tướng + số liệu nổi bật",
        "Điểm sáng chuyên môn 2: Đóng góp trong kèo đi đường hoặc giao tranh tổng"
      ],
      "weaknesses": [
        "Vấn đề chuyên môn 1 cần khắc phục (chết lẻ, thua CS/vàng trước đối thủ cùng đường, thiếu mắt kiểm soát, hoặc chọn vị trí lỗi...)",
        "Vấn đề chuyên môn 2 trong cách xử lý tình huống hoặc phối hợp macro"
      ],
      "actionableAdvice": [
        "Bài tập/Lời khuyên thực chiến 1 từ HLV gắn trực tiếp với combo/kỹ năng của tướng và kèo đối đầu trực tiếp",
        "Bài tập/Lời khuyên thực chiến 2 về quản lý thế lính, nhịp độ di chuyển (roam/teleport) hoặc chọn mục tiêu trong combat"
      ]
    }
  ]
}`;
}

/**
 * Generates baseline analysis directly from match metrics
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
    const dmgGap =
      blueP.totalDamageDealtToChampions - redP.totalDamageDealtToChampions;
    const winnerTeam: 100 | 200 | "EVEN" =
      Math.abs(scoreDiff) < 4 ? "EVEN" : scoreDiff > 0 ? 100 : 200;

    const winnerP = winnerTeam === 100 ? blueP : redP;
    const loserP = winnerTeam === 100 ? redP : blueP;

    const verdict =
      winnerTeam === "EVEN"
        ? `Kèo đấu giằng co giữa ${blueP.championName} (${blueP.kills}/${blueP.deaths}/${blueP.assists}) và ${redP.championName} (${redP.kills}/${redP.deaths}/${redP.assists}) với chênh lệch ${Math.abs(
            goldGap
          ).toLocaleString()} vàng và ${Math.abs(dmgGap).toLocaleString()} sát thương.`
        : `${winnerP.championName} (${winnerP.riotIdGameName}) thắng thế rõ rệt trước ${
            loserP.championName
          } (${loserP.riotIdGameName}) với KDA ${winnerP.kills}/${winnerP.deaths}/${
            winnerP.assists
          } so với ${loserP.kills}/${loserP.deaths}/${loserP.assists}, gác +${Math.abs(
            goldGap
          ).toLocaleString()} vàng và đóng góp ${
            winnerP.killParticipation
          }% hạ gục.`;

    return {
      role,
      blueChampion: blueP.championName,
      redChampion: redP.championName,
      winnerTeam,
      verdict,
    };
  });

  const allParticipants = [
    ...match.blueTeam.participants,
    ...match.redTeam.participants,
  ];
  const allPlayerReviews: PlayerReviewItem[] = allParticipants.map((p) =>
    buildSinglePlayerReview(match, p)
  );
  const focusedPlayerReview =
    allPlayerReviews.find((r) => r.puuid === focused.puuid) ||
    buildSinglePlayerReview(match, focused);

  return {
    overview: `Trận đấu kéo dài ${durationMin} phút với chiến thắng thuộc về ${
      match.blueTeam.win ? "Đội Xanh (Blue)" : "Đội Đỏ (Red)"
    } cùng tỷ số hạ gục ${winningTeam.totalKills} - ${
      losingTeam.totalKills
    } và chênh lệch ${goldDiff.toLocaleString()} vàng. ${
      winningTeam.participants[0].teamId === 100 ? "Đội Xanh" : "Đội Đỏ"
    } kiểm soát các mục tiêu lớn với ${
      winningTeam.objectives.dragon
    } Rồng nguyên tố và ${winningTeam.objectives.baron} bùa lợi Baron.`,
    winConditionSummary: `Chìa khóa chiến thắng đến từ khả năng tạo đột biến của ${mvp.championName} (${mvp.riotIdGameName}) với ${mvp.killParticipation}% tham gia hạ gục, kết hợp cùng kiểm soát mục tiêu giúp ăn ${winningTeam.objectives.baron} Baron và phá hủy ${winningTeam.objectives.tower} trụ bảo vệ.`,
    mvpPlayer: {
      name: `${mvp.riotIdGameName}#${mvp.riotIdTagline}`,
      champion: mvp.championName,
      role: mvp.role,
      reason: `Đạt điểm OP ${mvp.mvpScore} với KDA ${mvp.kills}/${mvp.deaths}/${mvp.assists}, gây ${mvp.totalDamageDealtToChampions.toLocaleString()} sát thương (${mvp.damageShare}% đội) và tham gia ${mvp.killParticipation}% mạng hạ gục.`,
    },
    svpPlayer: {
      name: `${svp.riotIdGameName}#${svp.riotIdTagline}`,
      champion: svp.championName,
      role: svp.role,
      reason: `Điểm sáng nổi bật nhất bên phía đội thua (Điểm OP ${svp.mvpScore}) với KDA ${svp.kills}/${svp.deaths}/${svp.assists} và ${svp.damageShare}% tỷ lệ sát thương toàn đội (${svp.totalDamageDealtToChampions.toLocaleString()} DMG).`,
    },
    focusedPlayerReview,
    allPlayerReviews,
    laneComparisons,
    macroInsights: [
      `Kiểm soát mục tiêu lớn: Đội thắng sở hữu ${winningTeam.objectives.dragon} Rồng và ${winningTeam.objectives.baron} Baron so với ${losingTeam.objectives.dragon} Rồng của đối phương — tạo áp lực lớn lên ${winningTeam.objectives.tower} trụ.`,
      `Chênh lệch tài nguyên: Khoảng cách ${goldDiff.toLocaleString()} vàng (${winningTeam.totalGold.toLocaleString()} vs ${losingTeam.totalGold.toLocaleString()}) tạo khác biệt rõ rệt từ ngưỡng trang bị lớn thứ 3.`,
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

async function callGroqDirectForAll10Players(
  match: NormalizedMatchData,
  prompt: string,
  apiKey: string,
  preferredModel: string
): Promise<{ parsed: Partial<AiMatchAnalysisResult>; modelUsed: string } | null> {
  if (!apiKey) return null;

  const normalizedModel =
    !preferredModel ||
    preferredModel === "llama-3.3-70b-versatile" ||
    preferredModel === "gpt-4o-mini" ||
    preferredModel === "default"
      ? "openai/gpt-oss-120b"
      : preferredModel;

  const candidateModels = Array.from(
    new Set([
      normalizedModel,
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
    ])
  );

  for (const model of candidateModels) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: apiKey.startsWith("Bearer ")
            ? apiKey
            : `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Bạn là Huấn luyện viên trưởng (Head Coach - HLV) chuyên nghiệp cấp độ LCK / Thách Đấu Liên Minh Huyền Thoại. Hãy mổ băng sâu sắc, trung thực, sát chất tướng (Q/W/E/R), kèo đấu cùng đường và số liệu của cả 10 người chơi. Tuyệt đối không dùng văn mẫu lặp lại giữa các người chơi. Luôn trả về duy nhất một chuỗi JSON hợp lệ bằng tiếng Việt.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.55,
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
        cache: "no-store",
      });

      if (!res.ok) continue;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) continue;

      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned) as Partial<AiMatchAnalysisResult>;
      return { parsed, modelUsed: model };
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const match: NormalizedMatchData = body.match;
    const focusPuuid: string | undefined = body.focusPuuid;

    const aiApiKey: string =
      body.customAiKey?.trim() ||
      process.env.AI_ANALYSIS_API_KEY?.trim() ||
      process.env.GROQ_API_KEY?.trim() ||
      "";
    const aiModel: string =
      body.customAiModel?.trim() ||
      process.env.AI_ANALYSIS_MODEL?.trim() ||
      "openai/gpt-oss-120b";

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

    const prompt = buildAiPromptForAll10Players(match);
    const fallbackBase = buildSmartAnalysisFromMatch(
      match,
      focusedParticipant,
      `Groq AI Coach (Fallback)`
    );

    // Call Groq LLM directly so all 10 players get real, deep AI coaching reviews
    try {
      const groqResult = await callGroqDirectForAll10Players(
        match,
        prompt,
        aiApiKey,
        aiModel
      );

      if (groqResult?.parsed) {
        const groqAnalysis = groqResult.parsed;
        const aiReviewsList = Array.isArray(groqAnalysis.allPlayerReviews)
          ? groqAnalysis.allPlayerReviews
          : [];

        const mergedAllReviews: PlayerReviewItem[] = (
          fallbackBase.allPlayerReviews || []
        ).map((fbItem) => {
          // Match by puuid first, or fallback to role + champion/playerName
          const aiMatch =
            aiReviewsList.find((r) => r.puuid && r.puuid === fbItem.puuid) ||
            aiReviewsList.find(
              (r) =>
                r.role === fbItem.role &&
                (r.champion?.toLowerCase() === fbItem.champion.toLowerCase() ||
                  r.playerName?.toLowerCase() ===
                    fbItem.playerName.toLowerCase())
            );

          if (!aiMatch) return fbItem;

          return {
            ...fbItem,
            grade: aiMatch.grade || fbItem.grade,
            summary: aiMatch.summary || fbItem.summary,
            strengths:
              Array.isArray(aiMatch.strengths) && aiMatch.strengths.length > 0
                ? aiMatch.strengths
                : fbItem.strengths,
            weaknesses:
              Array.isArray(aiMatch.weaknesses) && aiMatch.weaknesses.length > 0
                ? aiMatch.weaknesses
                : fbItem.weaknesses,
            actionableAdvice:
              Array.isArray(aiMatch.actionableAdvice) &&
              aiMatch.actionableAdvice.length > 0
                ? aiMatch.actionableAdvice
                : fbItem.actionableAdvice,
          };
        });

        const mergedFocused =
          mergedAllReviews.find((r) => r.puuid === focusedParticipant.puuid) ||
          mergedAllReviews[0] ||
          fallbackBase.focusedPlayerReview;

        const mergedResult: AiMatchAnalysisResult = {
          ...fallbackBase,
          ...groqAnalysis,
          overview: groqAnalysis.overview || fallbackBase.overview,
          winConditionSummary:
            groqAnalysis.winConditionSummary ||
            fallbackBase.winConditionSummary,
          mvpPlayer: groqAnalysis.mvpPlayer?.name
            ? groqAnalysis.mvpPlayer
            : fallbackBase.mvpPlayer,
          svpPlayer: groqAnalysis.svpPlayer?.name
            ? groqAnalysis.svpPlayer
            : fallbackBase.svpPlayer,
          laneComparisons:
            Array.isArray(groqAnalysis.laneComparisons) &&
            groqAnalysis.laneComparisons.length === 5
              ? groqAnalysis.laneComparisons
              : fallbackBase.laneComparisons,
          macroInsights:
            Array.isArray(groqAnalysis.macroInsights) &&
            groqAnalysis.macroInsights.length > 0
              ? groqAnalysis.macroInsights
              : fallbackBase.macroInsights,
          focusedPlayerReview: mergedFocused,
          allPlayerReviews: mergedAllReviews,
          usedEndpoint: `Groq AI HLV (${groqResult.modelUsed} - Phân tích sâu 10 người chơi)`,
        };

        return NextResponse.json({
          analysis: mergedResult,
        });
      }
    } catch {
      // Fallback if Groq request fails
    }

    return NextResponse.json({
      analysis: fallbackBase,
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
