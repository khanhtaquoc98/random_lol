"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AiMatchAnalysisResult,
  NormalizedMatchData,
  ParticipantStats,
  RiotPlatformId,
} from "@/types/match";
import { SAMPLE_MATCHES } from "@/data/sampleMatches";
import { DDRAGON_VERSION, getChampionSquareUrl } from "@/data/champions";
import { RoleIcon } from "./RoleIcon";
import {
  Search,
  BrainCircuit,
  Settings,
  Trophy,
  Swords,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Code2,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  RefreshCw,
} from "lucide-react";

const PLATFORMS: { id: RiotPlatformId; label: string }[] = [
  { id: "VN2", label: "VN2 (Việt Nam)" },
  { id: "KR", label: "KR (Hàn Quốc)" },
  { id: "SG2", label: "SG2 (Đông Nam Á)" },
  { id: "TW2", label: "TW2 (Đài Bắc)" },
  { id: "JP1", label: "JP1 (Nhật Bản)" },
  { id: "NA1", label: "NA1 (Bắc Mỹ)" },
  { id: "EUW1", label: "EUW1 (Tây Âu)" },
];

function getItemIconUrl(itemId: number): string | null {
  if (!itemId || itemId <= 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item/${itemId}.png`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}p ${s.toString().padStart(2, "0")}s`;
}

export function MatchAnalyzerApp() {
  const [searchMode, setSearchMode] = useState<"RIOT_ID" | "MATCH_ID">("RIOT_ID");
  const [queryInput, setQueryInput] = useState("Levi#VN2");
  const [platform, setPlatform] = useState<RiotPlatformId>("VN2");

  // API Settings (stored in localStorage + server .riot-key-cache.json)
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [riotApiKey, setRiotApiKey] = useState("");
  const [riotKeyStatus, setRiotKeyStatus] = useState<{
    hasKey: boolean;
    maskedKey: string;
    remainingHours: number;
    valid?: boolean;
    message?: string;
  } | null>(null);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [customAiUrl, setCustomAiUrl] = useState(
    "http://localhost:5555/api/analyze-lol-match"
  );
  const [customAiKey, setCustomAiKey] = useState("");
  const [customAiModel, setCustomAiModel] = useState("llama-3.3-70b-versatile");

  // Match State
  const [matches, setMatches] = useState<NormalizedMatchData[]>(SAMPLE_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<NormalizedMatchData>(
    SAMPLE_MATCHES[0]
  );
  const [focusedPuuid, setFocusedPuuid] = useState<string>(
    SAMPLE_MATCHES[0].blueTeam.participants[1].puuid // Levi Lee Sin default
  );
  const [isFetchingMatch, setIsFetchingMatch] = useState(false);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // AI Analysis State
  const [analysis, setAnalysis] = useState<AiMatchAnalysisResult | null>(null);
  const [sentPayloadPreview, setSentPayloadPreview] = useState<unknown>(null);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const checkServerRiotKey = useCallback(async (verifyLive = false) => {
    try {
      const res = await fetch(
        `/api/lol/riot-key${verifyLive ? "?verify=1" : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setRiotKeyStatus({
          hasKey: data.hasKey,
          maskedKey: data.maskedKey,
          remainingHours: data.remainingHours,
          valid: data.verification ? data.verification.valid : undefined,
          message: data.verification?.message,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Load saved AI endpoint settings on mount (Riot API Key is kept ONLY on the server for security)
  useEffect(() => {
    try {
      localStorage.removeItem("lol_riot_api_key");
      const savedAiUrl = localStorage.getItem("lol_ai_api_url") || "";
      const savedAiKey = localStorage.getItem("lol_ai_api_key") || "";
      const savedAiModel = localStorage.getItem("lol_ai_api_model") || "llama-3.3-70b-versatile";
      if (savedAiUrl) setCustomAiUrl(savedAiUrl);
      if (savedAiKey) setCustomAiKey(savedAiKey);
      if (savedAiModel) setCustomAiModel(savedAiModel);
    } catch {
      // ignore storage errors
    }
    checkServerRiotKey(true);
  }, [checkServerRiotKey]);

  const handleUpdateRiotKeyOnServer = async () => {
    if (!riotApiKey.trim()) return;
    setIsUpdatingKey(true);
    try {
      const res = await fetch("/api/lol/riot-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: riotApiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear plaintext key from browser memory immediately after server stores it
        setRiotApiKey("");
        setRiotKeyStatus({
          hasKey: true,
          maskedKey: data.maskedKey,
          remainingHours: data.remainingHours,
          valid: data.verification?.valid,
          message: data.verification?.message,
        });
      } else {
        setFetchError(data.error || "Không thể cập nhật Riot Key.");
      }
    } catch {
      // ignore
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const saveApiSettings = () => {
    try {
      localStorage.setItem("lol_ai_api_url", customAiUrl.trim());
      localStorage.setItem("lol_ai_api_key", customAiKey.trim());
      localStorage.setItem("lol_ai_api_model", customAiModel.trim());
    } catch {
      // ignore
    }
  };

  const triggerAiAnalysis = useCallback(
    async (matchToAnalyze: NormalizedMatchData, targetPuuid: string) => {
      setIsAnalyzing(true);
      setAnalysisError(null);

      const allParts = [
        ...matchToAnalyze.blueTeam.participants,
        ...matchToAnalyze.redTeam.participants,
      ];
      const focusedParticipant =
        allParts.find((p) => p.puuid === targetPuuid) || allParts[0];

      try {
        const targetUrl =
          customAiUrl.trim() || "http://localhost:5555/api/analyze-lol-match";

        // 1. If pointing to bot-summary API (/api/analyze-lol-match), try calling bot-summary directly first (CORS enabled)
        if (targetUrl.includes("analyze-lol-match")) {
          try {
            const directHeaders: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (customAiKey.trim()) {
              directHeaders["Authorization"] = `Bearer ${customAiKey.trim()}`;
            }
            const directBody = {
              match: matchToAnalyze,
              focusedPlayer: focusedParticipant,
              focusPuuid: targetPuuid,
              model: customAiModel.trim() || "llama-3.3-70b-versatile",
            };
            const directRes = await fetch(targetUrl, {
              method: "POST",
              headers: directHeaders,
              body: JSON.stringify(directBody),
            });
            if (directRes.ok) {
              const directData = await directRes.json();
              if (directData?.analysis) {
                setAnalysis(directData.analysis);
                setSentPayloadPreview(directBody);
                setIsAnalyzing(false);
                return;
              }
            }
          } catch {
            // Fall through to Next.js /api/analyze-match route
          }
        }

        // 2. Call Next.js proxy route (/api/analyze-match)
        const res = await fetch("/api/analyze-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match: matchToAnalyze,
            focusPuuid: targetPuuid,
            customAiUrl: customAiUrl.trim(),
            customAiKey: customAiKey.trim(),
            customAiModel: customAiModel.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setAnalysisError(data.error || "Không thể phân tích trận đấu.");
        } else {
          setAnalysis(data.analysis);
          setSentPayloadPreview(data.sentPayloadPreview);
        }
      } catch (err) {
        setAnalysisError(
          err instanceof Error ? err.message : "Lỗi kết nối tới /api/analyze-match"
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [customAiUrl, customAiKey, customAiModel]
  );

  // Run initial AI analysis on mount
  useEffect(() => {
    triggerAiAnalysis(
      SAMPLE_MATCHES[0],
      SAMPLE_MATCHES[0].blueTeam.participants[1].puuid
    );
  }, [triggerAiAnalysis]);

  const handleSearchMatches = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;

    saveApiSettings();
    setIsFetchingMatch(true);
    setFetchError(null);
    setFetchWarning(null);

    try {
      const params = new URLSearchParams({
        platform,
        count: "5",
      });
      if (searchMode === "RIOT_ID") {
        params.set("riotId", queryInput.trim());
      } else {
        params.set("matchId", queryInput.trim());
      }

      const headers: Record<string, string> = {};
      if (riotApiKey.trim()) {
        headers["x-riot-api-key"] = riotApiKey.trim();
      }

      const res = await fetch(`/api/lol/matches?${params.toString()}`, {
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setFetchError(data.error || "Lỗi khi lấy dữ liệu trận đấu từ Riot API.");
        if (data.keyExpired) {
          setShowApiConfig(true);
          setRiotKeyStatus((prev) =>
            prev ? { ...prev, valid: false, message: data.error } : null
          );
        }
        return;
      }

      if (data.warning) {
        setFetchWarning(data.warning);
      }

      if (Array.isArray(data.matches) && data.matches.length > 0) {
        setMatches(data.matches);
        const firstMatch: NormalizedMatchData = data.matches[0];
        setSelectedMatch(firstMatch);

        // Find the searched player inside the match if possible
        const allP = [
          ...firstMatch.blueTeam.participants,
          ...firstMatch.redTeam.participants,
        ];
        const queryName = queryInput.trim().split("#")[0].toLowerCase();
        const matchedPlayer =
          allP.find((p) => p.riotIdGameName.toLowerCase() === queryName) ||
          allP[0];

        setFocusedPuuid(matchedPlayer.puuid);
        triggerAiAnalysis(firstMatch, matchedPlayer.puuid);
      }
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Lỗi kết nối khi tìm trận đấu."
      );
    } finally {
      setIsFetchingMatch(false);
    }
  };

  const handleSelectSampleMatch = (sample: NormalizedMatchData) => {
    setSelectedMatch(sample);
    const defaultPlayer = sample.blueTeam.participants[1] || sample.blueTeam.participants[0];
    setFocusedPuuid(defaultPlayer.puuid);
    triggerAiAnalysis(sample, defaultPlayer.puuid);
  };

  const handleSelectParticipant = (p: ParticipantStats) => {
    setFocusedPuuid(p.puuid);
    triggerAiAnalysis(selectedMatch, p.puuid);
  };

  const allParticipants = [
    ...selectedMatch.blueTeam.participants,
    ...selectedMatch.redTeam.participants,
  ];
  const maxDamageInMatch = Math.max(
    1,
    ...allParticipants.map((p) => p.totalDamageDealtToChampions)
  );
  const focusedPlayer =
    allParticipants.find((p) => p.puuid === focusedPuuid) || allParticipants[0];

  const renderTeamTable = (
    team: NormalizedMatchData["blueTeam"],
    teamLabel: string,
    accentClass: string,
    borderClass: string
  ) => {
    const sortedByMvp = [...team.participants].sort(
      (a, b) => b.mvpScore - a.mvpScore
    );
    const topPuuid = sortedByMvp[0]?.puuid;

    return (
      <div
        className={`rounded-xl bg-[#091428]/90 border ${borderClass} overflow-hidden shadow-xl`}
      >
        {/* Team Header & Objectives */}
        <div className="px-4 py-3 bg-[#010A13]/85 border-b border-[#C8AA6E]/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                team.win
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/50"
              }`}
            >
              {team.win ? "CHIẾN THẮNG" : "THẤT BẠI"}
            </span>
            <h3 className={`text-sm sm:text-base font-black uppercase ${accentClass}`}>
              {teamLabel}
            </h3>
            <span className="text-xs text-[#C8AA6E]/80">
              • {team.totalKills} Hạ gục • {(team.totalGold / 1000).toFixed(1)}k Vàng
            </span>
          </div>

          {/* Objective Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#F0E6D2]">
            <span className="px-2 py-0.5 rounded bg-[#091428] border border-[#C8AA6E]/30">
              🐉 Rồng: <strong>{team.objectives.dragon}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#091428] border border-[#C8AA6E]/30">
              👾 Baron: <strong>{team.objectives.baron}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#091428] border border-[#C8AA6E]/30">
              🪲 Sâu: <strong>{team.objectives.horde}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#091428] border border-[#C8AA6E]/30">
              🗼 Trụ: <strong>{team.objectives.tower}</strong>
            </span>
          </div>
        </div>

        {/* 5 Players Rows */}
        <div className="divide-y divide-[#C8AA6E]/15">
          {team.participants.map((p) => {
            const isFocused = p.puuid === focusedPuuid;
            const isTopPerformer = p.puuid === topPuuid;
            const dmgPercent = Math.round(
              (p.totalDamageDealtToChampions / maxDamageInMatch) * 100
            );

            return (
              <div
                key={p.puuid}
                onClick={() => handleSelectParticipant(p)}
                className={`p-3 sm:px-4 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                  isFocused
                    ? "bg-[#0AC8B9]/15 border-l-4 border-l-[#0AC8B9]"
                    : "hover:bg-[#010A13]/60"
                }`}
              >
                {/* Left: Role + Champion + Riot ID */}
                <div className="flex items-center gap-3 min-w-[230px]">
                  <div className="w-7 h-7 rounded bg-[#010A13] border border-[#C8AA6E]/35 flex items-center justify-center text-[#C8AA6E] shrink-0">
                    <RoleIcon role={p.role} className="w-4 h-4" />
                  </div>

                  <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#C8AA6E] shrink-0 bg-[#010A13]">
                    <img
                      src={getChampionSquareUrl(p.championId)}
                      alt={p.championName}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 px-1 text-[10px] font-bold bg-[#010A13]/90 text-[#F0E6D2]">
                      {p.champLevel}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#F0E6D2] truncate">
                        {p.riotIdGameName}
                      </span>
                      <span className="text-[11px] text-[#C8AA6E]/70">
                        #{p.riotIdTagline}
                      </span>
                      {isTopPerformer && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                            team.win
                              ? "bg-amber-400 text-[#010A13]"
                              : "bg-purple-400 text-[#010A13]"
                          }`}
                        >
                          {team.win ? "MVP" : "SVP"}
                        </span>
                      )}
                      {isFocused && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#0AC8B9] text-[#010A13]">
                          Đang phân tích
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#C8AA6E]/85 flex items-center gap-2">
                      <span>{p.championName}</span>
                      <span>•</span>
                      <span className="text-[11px] text-[#C8AA6E]/65">
                        {p.primaryRune}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: KDA + CS + Gold + Vision */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 items-center text-xs">
                  <div>
                    <div className="font-extrabold text-[#F0E6D2] text-sm">
                      {p.kills} / <span className="text-rose-400">{p.deaths}</span> /{" "}
                      {p.assists}
                    </div>
                    <div className="text-[11px] text-[#C8AA6E]">
                      {p.kda} KDA • KP {p.killParticipation}%
                    </div>
                  </div>

                  {/* Damage Dealt Bar */}
                  <div className="min-w-[110px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#F0E6D2] font-bold">
                        {p.totalDamageDealtToChampions.toLocaleString()}
                      </span>
                      <span className="text-[#C8AA6E]/75">{p.damageShare}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#010A13] overflow-hidden border border-[#C8AA6E]/20">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${dmgPercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-[#F0E6D2]">
                      {p.cs} CS ({p.csPerMin}/p)
                    </div>
                    <div className="text-[11px] text-amber-300/90">
                      {(p.goldEarned / 1000).toFixed(1)}k vàng
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <div className="font-bold text-[#0AC8B9]">
                      👁️ {p.visionScore} tầm nhìn
                    </div>
                    <div className="text-[11px] text-[#C8AA6E]/75">
                      Điểm OP: <strong className="text-[#F0E6D2]">{p.mvpScore}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: 6 Items + Trinket */}
                <div className="flex items-center gap-1">
                  {p.items.map((itemId, idx) => {
                    const iconUrl = getItemIconUrl(itemId);
                    return (
                      <div
                        key={idx}
                        className={`w-7 h-7 rounded bg-[#010A13] border ${
                          idx === 6
                            ? "border-amber-500/40 rounded-full ml-1"
                            : "border-[#C8AA6E]/30"
                        } overflow-hidden flex items-center justify-center`}
                      >
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={`Item ${itemId}`}
                            width={28}
                            height={28}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8AA6E]/15" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 max-w-[1440px] mx-auto">
      {/* Page Title & API Config Toggle */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#C8AA6E]/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0AC8B9]/15 border border-[#0AC8B9]/40 text-[#0AC8B9] text-xs font-bold uppercase tracking-widest mb-2">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Riot Match-V5 API + AI Match Coach</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#F0E6D2] uppercase">
              Phân Tích Trận Đấu LMHT{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0AC8B9] via-[#F0E6D2] to-[#C8AA6E]">
                Bằng Trí Tuệ Nhân Tạo (AI)
              </span>
            </h1>
            <p className="text-sm text-[#C8AA6E]/85 mt-1 max-w-3xl">
              Tra cứu thông tin trận đấu qua{" "}
              <strong className="text-[#F0E6D2]">
                Riot Official API (Account-V1 &amp; Match-V5)
              </strong>{" "}
              bằng Riot ID (<code className="text-[#0AC8B9]">Tên#Tag</code>) hoặc{" "}
              <code className="text-[#0AC8B9]">Match ID</code>, sau đó gửi dữ liệu
              chuẩn hóa sang{" "}
              <strong className="text-[#C8AA6E]">API AI (/api/analyze-match)</strong>{" "}
              để đánh giá từng đường và gợi ý chiến thuật.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {riotKeyStatus && (
              <button
                type="button"
                onClick={() => setShowApiConfig(true)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                  riotKeyStatus.valid === false
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/60"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/45"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    riotKeyStatus.valid === false
                      ? "bg-rose-400 animate-ping"
                      : "bg-emerald-400"
                  }`}
                />
                <span>
                  Riot Key: {riotKeyStatus.maskedKey}{" "}
                  {riotKeyStatus.valid === false
                    ? "(Đã hết hạn)"
                    : `(~${riotKeyStatus.remainingHours}h)`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowApiConfig((v) => !v)}
              className="hextech-action-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#091428] text-[#F0E6D2] border border-[#C8AA6E]/50 hover:border-[#0AC8B9] cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#0AC8B9]" />
              <span>Đổi Riot Key / Cấu Hình AI</span>
              {showApiConfig ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPayloadModal((v) => !v)}
              className="hextech-action-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#091428] text-[#C8AA6E] border border-[#C8AA6E]/40 hover:border-[#C8AA6E] cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-[#C8AA6E]" />
              <span>Xem JSON Payload Gửi AI</span>
            </button>
          </div>
        </div>

        {/* Collapsible API Configuration Panel */}
        {showApiConfig && (
          <div className="mt-4 p-5 rounded-xl bg-[#091428]/95 border border-[#0AC8B9]/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#C8AA6E]/20 pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[#0AC8B9]">
                  ⚙️ Cấu hình kết nối API (Riot Match-V5 &amp; AI Analysis Endpoint)
                </h2>
                <p className="text-xs text-[#C8AA6E]/80 mt-0.5">
                  Bạn có thể điền trực tiếp tại đây (lưu trên trình duyệt) hoặc đặt
                  trong file <code>.env.local</code> với biến{" "}
                  <code>RIOT_API_KEY</code>, <code>AI_ANALYSIS_API_URL</code>,{" "}
                  <code>AI_ANALYSIS_API_KEY</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Riot API Key */}
              <div className="p-3.5 rounded-lg bg-[#010A13]/80 border border-[#C8AA6E]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#F0E6D2] uppercase tracking-wider">
                    1. Đổi nhanh Riot Games API Key (Hot-Reload không cần restart)
                  </label>
                  {riotKeyStatus && (
                    <span className="text-[11px] text-[#0AC8B9] font-mono">
                      Đang dùng: {riotKeyStatus.maskedKey}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={riotApiKey}
                    onChange={(e) => setRiotApiKey(e.target.value)}
                    placeholder="Dán RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx mới vào đây..."
                    className="flex-1 px-3 py-2 rounded bg-[#091428] border border-[#C8AA6E]/40 text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateRiotKeyOnServer}
                    disabled={isUpdatingKey}
                    className="px-3.5 py-2 rounded font-bold uppercase bg-gradient-to-r from-[#C8AA6E] to-[#9E7E43] text-[#010A13] hover:opacity-90 cursor-pointer shrink-0"
                  >
                    {isUpdatingKey ? "Đang lưu..." : "Cập Nhật Key"}
                  </button>
                </div>
                {riotKeyStatus?.message && (
                  <p
                    className={`text-[11px] font-semibold ${
                      riotKeyStatus.valid === false
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {riotKeyStatus.message}
                  </p>
                )}
                <p className="text-[11px] text-[#C8AA6E]/75">
                  💡 <strong>Mẹo không bao giờ hết hạn:</strong> Trên{" "}
                  <a
                    href="https://developer.riotgames.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0AC8B9] underline"
                  >
                    developer.riotgames.com
                  </a>
                  , bấm <strong>&ldquo;Register Project&rdquo; &rarr; &ldquo;Personal API Key&rdquo;</strong> để nhận key vĩnh viễn không bị giới hạn 24h!
                </p>
              </div>

              {/* Custom AI API Endpoint */}
              <div className="p-3.5 rounded-lg bg-[#010A13]/80 border border-[#0AC8B9]/35 space-y-2">
                <label className="block font-bold text-[#0AC8B9] uppercase tracking-wider">
                  2. Endpoint API Phân Tích AI Của Bạn (Tùy chọn)
                </label>
                <input
                  type="url"
                  value={customAiUrl}
                  onChange={(e) => setCustomAiUrl(e.target.value)}
                  placeholder="https://your-ai-api.com/analyze hoặc https://api.openai.com/v1/chat/completions"
                  className="w-full px-3 py-2 rounded bg-[#091428] border border-[#C8AA6E]/40 text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
                />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="password"
                    value={customAiKey}
                    onChange={(e) => setCustomAiKey(e.target.value)}
                    placeholder="Bearer API Key (nếu có)"
                    className="w-full px-3 py-1.5 rounded bg-[#091428] border border-[#C8AA6E]/35 text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
                  />
                  <input
                    type="text"
                    value={customAiModel}
                    onChange={(e) => setCustomAiModel(e.target.value)}
                    placeholder="Model (vd: gpt-4o-mini)"
                    className="w-full px-3 py-1.5 rounded bg-[#091428] border border-[#C8AA6E]/35 text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  saveApiSettings();
                  triggerAiAnalysis(selectedMatch, focusedPuuid);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-[#0AC8B9] text-[#010A13] hover:opacity-90 cursor-pointer"
              >
                Lưu Cấu Hình &amp; Chạy Phân Tích Lại
              </button>
            </div>
          </div>
        )}

        {/* JSON Payload Preview Drawer */}
        {showPayloadModal && (
          <div className="mt-4 p-4 rounded-xl bg-[#010A13] border border-[#C8AA6E]/50 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#C8AA6E] uppercase">
                📦 Cấu trúc dữ liệu trận đấu gửi tới API AI (/api/analyze-match):
              </span>
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="text-[#C8AA6E] hover:text-[#F0E6D2] underline cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <pre className="p-3 rounded bg-[#091428] text-[#0AC8B9] overflow-x-auto max-h-[260px] text-[11px] leading-relaxed">
              {JSON.stringify(
                sentPayloadPreview || { match: selectedMatch, focusedPlayer },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Search & Sample Match Selector Bar */}
        <div className="mt-5 p-4 rounded-xl bg-[#091428]/90 border border-[#C8AA6E]/35 shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <form
            onSubmit={handleSearchMatches}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1"
          >
            {/* Mode Toggle */}
            <div className="inline-flex rounded-lg p-1 bg-[#010A13] border border-[#C8AA6E]/35 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchMode("RIOT_ID");
                  setQueryInput("Levi#VN2");
                }}
                className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                  searchMode === "RIOT_ID"
                    ? "bg-[#C8AA6E] text-[#010A13]"
                    : "text-[#C8AA6E]"
                }`}
              >
                Riot ID (Tên#Tag)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("MATCH_ID");
                  setQueryInput("VN2_489102341");
                }}
                className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                  searchMode === "MATCH_ID"
                    ? "bg-[#C8AA6E] text-[#010A13]"
                    : "text-[#C8AA6E]"
                }`}
              >
                Match ID
              </button>
            </div>

            {/* Platform Select */}
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as RiotPlatformId)}
              className="px-3 py-2.5 rounded-lg bg-[#010A13] border border-[#C8AA6E]/40 text-xs font-bold text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
            >
              {PLATFORMS.map((pf) => (
                <option key={pf.id} value={pf.id}>
                  {pf.label}
                </option>
              ))}
            </select>

            {/* Input */}
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={
                searchMode === "RIOT_ID"
                  ? "Nhập Riot ID (VD: Levi#VN2, Hide on bush#KR1)..."
                  : "Nhập Match ID (VD: VN2_489102341)..."
              }
              className="flex-1 min-w-[200px] px-3.5 py-2.5 rounded-lg bg-[#010A13] border border-[#C8AA6E]/40 text-sm text-[#F0E6D2] focus:outline-none focus:border-[#0AC8B9]"
            />

            <button
              type="submit"
              disabled={isFetchingMatch}
              className="hextech-action-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-[#C8AA6E] to-[#9E7E43] text-[#010A13] cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{isFetchingMatch ? "Đang tải..." : "Lấy Trận Đấu"}</span>
            </button>
          </form>

          {/* Quick Sample Matches Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-[#C8AA6E]/20">
            <span className="text-xs font-bold uppercase text-[#C8AA6E]">
              Trận mẫu có sẵn:
            </span>
            {SAMPLE_MATCHES.map((sm) => (
              <button
                key={sm.matchId}
                type="button"
                onClick={() => handleSelectSampleMatch(sm)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  selectedMatch.matchId === sm.matchId
                    ? "bg-[#0AC8B9]/20 text-[#0AC8B9] border-[#0AC8B9]"
                    : "bg-[#010A13] text-[#F0E6D2] border-[#C8AA6E]/35 hover:border-[#C8AA6E]"
                }`}
              >
                {sm.platformId}: {sm.matchId}
              </button>
            ))}
          </div>
        </div>

        {/* Notices */}
        {fetchWarning && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{fetchWarning}</span>
          </div>
        )}
        {fetchError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Recent Matches Switcher if multiple matches returned */}
        {matches.length > 1 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-[#C8AA6E] shrink-0">
              Danh sách trận tìm thấy:
            </span>
            {matches.map((m) => (
              <button
                key={m.matchId}
                type="button"
                onClick={() => handleSelectSampleMatch(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 cursor-pointer ${
                  selectedMatch.matchId === m.matchId
                    ? "bg-[#C8AA6E]/25 text-[#F0E6D2] border-[#C8AA6E]"
                    : "bg-[#091428] text-[#C8AA6E]/80 border-[#C8AA6E]/25"
                }`}
              >
                {m.matchId} ({formatDuration(m.gameDurationSeconds)})
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Match Banner Summary */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-950/70 via-[#091428] to-rose-950/70 border border-[#C8AA6E]/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded bg-[#010A13] border border-[#C8AA6E]/40 text-xs font-mono text-[#0AC8B9]">
            #{selectedMatch.matchId}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#F0E6D2]">
              {selectedMatch.queueName}
            </h2>
            <p className="text-xs text-[#C8AA6E]/80">
              Thời lượng: <strong>{formatDuration(selectedMatch.gameDurationSeconds)}</strong>{" "}
              • Phiên bản: <strong>{selectedMatch.gameVersion}</strong> • Nguồn:{" "}
              <strong className="text-[#0AC8B9]">
                {selectedMatch.source === "RIOT_API"
                  ? "Riot Match-V5 Live"
                  : "Dữ liệu chuẩn Match-V5"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#C8AA6E]">
            💡 <em>Bấm vào bất kỳ người chơi nào bên dưới để AI phân tích sâu người đó</em>
          </span>
          <button
            type="button"
            onClick={() => triggerAiAnalysis(selectedMatch, focusedPuuid)}
            disabled={isAnalyzing}
            className="hextech-action-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#0AC8B9] to-[#05968A] text-[#010A13] shadow-[0_0_20px_rgba(10,200,185,0.35)] cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`}
            />
            <span>{isAnalyzing ? "AI Đang Phân Tích..." : "Phân Tích Lại Bằng AI"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Left Scoreboards (5v5) + Right AI Coach Report */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 Cols: Blue Team & Red Team Scoreboards */}
        <div className="xl:col-span-7 space-y-5">
          {renderTeamTable(
            selectedMatch.blueTeam,
            "Đội Xanh (Blue Team)",
            "text-sky-400",
            "border-sky-500/40"
          )}
          {renderTeamTable(
            selectedMatch.redTeam,
            "Đội Đỏ (Red Team)",
            "text-rose-400",
            "border-rose-500/40"
          )}
        </div>

        {/* Right 5 Cols: AI Match Analysis Report */}
        <div className="xl:col-span-5 space-y-5">
          <section className="p-5 rounded-xl bg-[#091428]/95 border border-[#0AC8B9]/60 shadow-[0_0_30px_rgba(10,200,185,0.15)]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#C8AA6E]/25">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[#0AC8B9]" />
                <h2 className="text-base font-black uppercase tracking-wider text-[#F0E6D2]">
                  Báo Cáo Phân Tích Từ AI Coach
                </h2>
              </div>
              {isAnalyzing && (
                <span className="text-xs font-bold text-[#0AC8B9] animate-pulse">
                  Đang tổng hợp...
                </span>
              )}
            </div>

            {analysisError ? (
              <div className="p-4 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                {analysisError}
              </div>
            ) : analysis ? (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* 1. Overview & Win Condition */}
                <div className="p-3.5 rounded-lg bg-[#010A13]/80 border border-[#C8AA6E]/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#C8AA6E]">
                    <Sparkles className="w-4 h-4 text-[#0AC8B9]" />
                    <span>Tổng Quan Cục Diện &amp; Điều Kiện Thắng</span>
                  </div>
                  <p className="text-[#F0E6D2] leading-relaxed">
                    {analysis.overview}
                  </p>
                  <p className="text-xs text-[#0AC8B9] pt-1 border-t border-[#C8AA6E]/15">
                    <strong>Điểm bước ngoặt:</strong> {analysis.winConditionSummary}
                  </p>
                </div>

                {/* 2. MVP & SVP Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-300 mb-1">
                      <Trophy className="w-4 h-4" />
                      <span>MVP Trận Đấu ({analysis.mvpPlayer.role})</span>
                    </div>
                    <div className="font-bold text-[#F0E6D2]">
                      {analysis.mvpPlayer.champion} — {analysis.mvpPlayer.name}
                    </div>
                    <p className="text-xs text-[#C8AA6E]/90 mt-1">
                      {analysis.mvpPlayer.reason}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/40">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-300 mb-1">
                      <Award className="w-4 h-4" />
                      <span>SVP Đội Thua ({analysis.svpPlayer.role})</span>
                    </div>
                    <div className="font-bold text-[#F0E6D2]">
                      {analysis.svpPlayer.champion} — {analysis.svpPlayer.name}
                    </div>
                    <p className="text-xs text-[#C8AA6E]/90 mt-1">
                      {analysis.svpPlayer.reason}
                    </p>
                  </div>
                </div>

                {/* 3. Focused Player Coaching Review */}
                <div className="p-4 rounded-xl bg-gradient-to-b from-[#0AC8B9]/15 to-[#010A13]/90 border border-[#0AC8B9]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getChampionSquareUrl(focusedPlayer.championId)}
                        alt={focusedPlayer.championName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg border border-[#0AC8B9]"
                      />
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0AC8B9]">
                          Đánh Giá Cá Nhân • Đường {analysis.focusedPlayerReview.role}
                        </span>
                        <h3 className="text-sm font-black text-[#F0E6D2]">
                          {analysis.focusedPlayerReview.playerName} (
                          {analysis.focusedPlayerReview.champion})
                        </h3>
                      </div>
                    </div>

                    <div className="text-center px-3 py-1 rounded-lg bg-[#010A13] border border-[#C8AA6E]">
                      <span className="block text-[10px] uppercase text-[#C8AA6E]">
                        Hạng AI
                      </span>
                      <span className="text-lg font-black text-[#0AC8B9]">
                        {analysis.focusedPlayerReview.grade}
                      </span>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-emerald-300 flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Điểm Mạnh Trong Trận</span>
                    </h4>
                    <ul className="space-y-1 text-xs text-[#F0E6D2]/90 list-disc list-inside">
                      {analysis.focusedPlayerReview.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-amber-300 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Điểm Cần Khắc Phục</span>
                    </h4>
                    <ul className="space-y-1 text-xs text-[#F0E6D2]/90 list-disc list-inside">
                      {analysis.focusedPlayerReview.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Actionable Coaching Advice */}
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-[#0AC8B9] flex items-center gap-1.5 mb-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Gợi Ý Cải Thiện Từ AI Cho Trận Sau</span>
                    </h4>
                    <ul className="space-y-1 text-xs text-[#F0E6D2]/90 list-disc list-inside">
                      {analysis.focusedPlayerReview.actionableAdvice.map(
                        (adv, i) => (
                          <li key={i}>{adv}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                {/* 4. Lane-by-Lane Verdict (TOP / JG / MID / AD / SP) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#C8AA6E] flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-[#0AC8B9]" />
                    <span>So Sánh Đối Đầu 5 Đường (TOP / JG / MID / AD / SP)</span>
                  </h3>
                  <div className="space-y-2">
                    {analysis.laneComparisons.map((lc) => (
                      <div
                        key={lc.role}
                        className="p-2.5 rounded-lg bg-[#010A13]/80 border border-[#C8AA6E]/25 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-[#C8AA6E] flex items-center gap-1.5">
                            <RoleIcon role={lc.role} className="w-3.5 h-3.5" />
                            <span>
                              {lc.role}: {lc.blueChampion} vs {lc.redChampion}
                            </span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              lc.winnerTeam === 100
                                ? "bg-sky-500/20 text-sky-300"
                                : lc.winnerTeam === 200
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-[#C8AA6E]/20 text-[#C8AA6E]"
                            }`}
                          >
                            {lc.winnerTeam === 100
                              ? "Đội Xanh Thắng Đường"
                              : lc.winnerTeam === 200
                              ? "Đội Đỏ Thắng Đường"
                              : "Cân Bằng"}
                          </span>
                        </div>
                        <p className="text-[#F0E6D2]/85">{lc.verdict}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Macro Insights */}
                <div className="p-3.5 rounded-lg bg-[#010A13]/75 border border-[#C8AA6E]/25 space-y-1.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#C8AA6E] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Đánh Giá Macro &amp; Kiểm Soát Bản Đồ</span>
                  </h3>
                  <ul className="space-y-1 text-xs text-[#F0E6D2]/90 list-disc list-inside">
                    {analysis.macroInsights.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[11px] text-[#C8AA6E]/65 pt-2 border-t border-[#C8AA6E]/15 flex items-center justify-between">
                  <span>Engine: {analysis.usedEndpoint}</span>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
