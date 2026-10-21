"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  copyElementAsPngToClipboard,
  downloadElementAsPng,
} from "@/lib/copyElementAsImage";
import {
  Search,
  BrainCircuit,
  Trophy,
  Swords,
  Flame,
  AlertTriangle,
  Sparkles,
  Award,
  RefreshCw,
  Clock,
  UserCheck,
  X,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ListFilter,
  Camera,
  Download,
  Check,
} from "lucide-react";

const PLATFORMS: { id: RiotPlatformId; label: string; defaultTag: string }[] = [
  { id: "VN2", label: "VN2 (Việt Nam)", defaultTag: "VN2" },
  { id: "KR", label: "KR (Hàn Quốc)", defaultTag: "KR1" },
  { id: "SG2", label: "SG2 (Đông Nam Á)", defaultTag: "SG2" },
  { id: "TW2", label: "TW2 (Đài Bắc)", defaultTag: "TW2" },
  { id: "JP1", label: "JP1 (Nhật Bản)", defaultTag: "JP1" },
  { id: "NA1", label: "NA1 (Bắc Mỹ)", defaultTag: "NA1" },
  { id: "EUW1", label: "EUW1 (Tây Âu)", defaultTag: "EUW" },
];

interface AutocompleteOption {
  riotId: string;
  platform: RiotPlatformId;
  championId?: string;
  subtitle: string;
  category: "RECENT" | "MATCH_PLAYER" | "FEATURED" | "AUTO_TAG";
}

const FEATURED_RIOT_IDS: AutocompleteOption[] = [
  {
    riotId: "Capta1n Live#2804",
    platform: "VN2",
    championId: "LeeSin",
    subtitle: "Việt Nam (VN2)",
    category: "FEATURED",
  },
  {
    riotId: "Levi#VN2",
    platform: "VN2",
    championId: "LeeSin",
    subtitle: "GAM Esports • Đi Rừng",
    category: "FEATURED",
  },
  {
    riotId: "Kiaya#GAM",
    platform: "VN2",
    championId: "Aatrox",
    subtitle: "GAM Esports • Đường Trên",
    category: "FEATURED",
  },
  {
    riotId: "Artemis#ADC",
    platform: "VN2",
    championId: "KaiSa",
    subtitle: "VCS • Xạ Thủ",
    category: "FEATURED",
  },
  {
    riotId: "SofM#VN2",
    platform: "VN2",
    championId: "Graves",
    subtitle: "VCS Legend • Đi Rừng",
    category: "FEATURED",
  },
  {
    riotId: "Hide on bush#KR1",
    platform: "KR",
    championId: "Azir",
    subtitle: "T1 Faker • Đường Giữa",
    category: "FEATURED",
  },
  {
    riotId: "Chovy#KR1",
    platform: "KR",
    championId: "Yone",
    subtitle: "Gen.G • Đường Giữa",
    category: "FEATURED",
  },
  {
    riotId: "Canyon#KR1",
    platform: "KR",
    championId: "Nidalee",
    subtitle: "Gen.G • Đi Rừng",
    category: "FEATURED",
  },
  {
    riotId: "Zeus#KR1",
    platform: "KR",
    championId: "Jayce",
    subtitle: "LCK • Đường Trên",
    category: "FEATURED",
  },
  {
    riotId: "Gumayusi#T1",
    platform: "KR",
    championId: "Jinx",
    subtitle: "T1 • Xạ Thủ",
    category: "FEATURED",
  },
  {
    riotId: "Keria#T1",
    platform: "KR",
    championId: "Thresh",
    subtitle: "T1 • Hỗ Trợ",
    category: "FEATURED",
  },
];

const RECENT_STORAGE_KEY = "lol_recent_riot_id_searches_v1";

function getItemIconUrl(itemId: number): string | null {
  if (!itemId || itemId <= 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item/${itemId}.png`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}p ${s.toString().padStart(2, "0")}s`;
}

function formatTimeAgo(timestampMs: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - timestampMs) / 60000));
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function findPrimaryPlayerInMatch(
  match: NormalizedMatchData,
  searchedRiotId: string
): ParticipantStats {
  const allP = [
    ...match.blueTeam.participants,
    ...match.redTeam.participants,
  ];
  const queryName = searchedRiotId.trim().split("#")[0].toLowerCase();
  if (queryName) {
    const exact = allP.find(
      (p) => p.riotIdGameName.toLowerCase() === queryName
    );
    if (exact) return exact;
    const partial = allP.find((p) =>
      p.riotIdGameName.toLowerCase().includes(queryName)
    );
    if (partial) return partial;
  }
  return allP[1] || allP[0];
}

export function MatchAnalyzerApp() {
  const [searchMode, setSearchMode] = useState<"RIOT_ID" | "MATCH_ID">(
    "RIOT_ID"
  );
  const [queryInput, setQueryInput] = useState("Levi#VN2");
  const [searchedPlayerLabel, setSearchedPlayerLabel] = useState("Levi#VN2");
  const [platform, setPlatform] = useState<RiotPlatformId>("VN2");
  const [queueFilter, setQueueFilter] = useState<
    "ALL" | "ARAM" | "SOLO" | "FLEX"
  >("ALL");
  const [hasSearchedLive, setHasSearchedLive] = useState(false);

  // Autocomplete State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<AutocompleteOption[]>(
    []
  );
  const comboboxRef = useRef<HTMLDivElement>(null);
  const matchDetailCaptureRef = useRef<HTMLDivElement>(null);
  const aiEvaluationRef = useRef<HTMLDivElement>(null);
  const analysisCacheRef = useRef<Record<string, AiMatchAnalysisResult>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Step 1 vs Step 2 View State
  const [matches, setMatches] =
    useState<NormalizedMatchData[]>(SAMPLE_MATCHES);
  const [selectedMatch, setSelectedMatch] =
    useState<NormalizedMatchData | null>(null);
  const [focusedPuuid, setFocusedPuuid] = useState<string>("");

  const [isFetchingMatch, setIsFetchingMatch] = useState(false);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // AI Analysis State
  const [analysis, setAnalysis] = useState<AiMatchAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [reviewTeamFilter, setReviewTeamFilter] = useState<
    | "LANE_VS"
    | "ROLE_TOP"
    | "ROLE_JG"
    | "ROLE_MID"
    | "ROLE_AD"
    | "ROLE_SP"
    | "BLUE"
    | "RED"
  >("LANE_VS");

  // Image Copy / Export State
  const [copyingTargetId, setCopyingTargetId] = useState<string | null>(null);
  const [copiedTargetId, setCopiedTargetId] = useState<string | null>(null);
  const [copyStatusText, setCopyStatusText] = useState<string | null>(null);

  const handleCopyElementImage = useCallback(
    async (
      targetEl: HTMLElement | null,
      targetId: string,
      label: string,
      filename: string
    ) => {
      if (!targetEl || copyingTargetId) return;
      setCopyingTargetId(targetId);
      setCopyStatusText(null);
      try {
        const res = await copyElementAsPngToClipboard(targetEl, {
          filename,
          watermarkText: `LoL Hub AI Match Coach • ${label}`,
        });
        setCopiedTargetId(targetId);
        setCopyStatusText(
          res.mode === "CLIPBOARD"
            ? `✅ Đã copy ảnh (${label}) vào Clipboard! Bạn có thể nhấn Ctrl+V (hoặc Cmd+V) để dán ngay.`
            : `✅ Trình duyệt đã tự động tải ảnh PNG (${label}) về máy của bạn!`
        );
        setTimeout(() => {
          setCopiedTargetId((prev) => (prev === targetId ? null : prev));
        }, 3500);
        setTimeout(() => {
          setCopyStatusText(null);
        }, 6000);
      } catch (err) {
        setCopyStatusText(
          `⚠️ Không thể chụp ảnh: ${
            err instanceof Error ? err.message : "Lỗi không xác định"
          }`
        );
      } finally {
        setCopyingTargetId(null);
      }
    },
    [copyingTargetId]
  );

  const handleDownloadElementImage = useCallback(
    async (
      targetEl: HTMLElement | null,
      targetId: string,
      label: string,
      filename: string
    ) => {
      if (!targetEl || copyingTargetId) return;
      setCopyingTargetId(targetId);
      setCopyStatusText(null);
      try {
        await downloadElementAsPng(targetEl, {
          filename,
          watermarkText: `LoL Hub AI Match Coach • ${label}`,
        });
        setCopiedTargetId(targetId);
        setCopyStatusText(`✅ Đã tải file ảnh PNG (${filename}) về máy!`);
        setTimeout(() => {
          setCopiedTargetId((prev) => (prev === targetId ? null : prev));
        }, 3500);
        setTimeout(() => {
          setCopyStatusText(null);
        }, 5000);
      } catch (err) {
        setCopyStatusText(
          `⚠️ Lỗi tải ảnh: ${
            err instanceof Error ? err.message : "Lỗi không xác định"
          }`
        );
      } finally {
        setCopyingTargetId(null);
      }
    },
    [copyingTargetId]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = useCallback((option: AutocompleteOption) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.riotId.toLowerCase() !== option.riotId.toLowerCase()
      );
      const updated = [
        { ...option, category: "RECENT" as const },
        ...filtered,
      ].slice(0, 8);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = (riotIdToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.riotId !== riotIdToRemove);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const autocompleteSuggestions = useMemo<AutocompleteOption[]>(() => {
    const q = queryInput.trim().toLowerCase();

    if (searchMode === "MATCH_ID") {
      const matchOptions: AutocompleteOption[] = matches.map((m) => ({
        riotId: m.matchId,
        platform: m.platformId,
        subtitle: `${m.queueName} (${formatDuration(m.gameDurationSeconds)})`,
        category: "MATCH_PLAYER",
      }));
      return matchOptions.filter(
        (opt) => !q || opt.riotId.toLowerCase().includes(q)
      );
    }

    const seen = new Set<string>();
    const list: AutocompleteOption[] = [];

    const addUnique = (opt: AutocompleteOption) => {
      const key = opt.riotId.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(opt);
      }
    };

    const rawTrimmed = queryInput.trim();
    if (rawTrimmed.length >= 2 && !rawTrimmed.includes("#")) {
      const currentPlatObj =
        PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
      addUnique({
        riotId: `${rawTrimmed}#${currentPlatObj.defaultTag}`,
        platform,
        subtitle: `Gợi ý Tag mặc định máy chủ ${platform}`,
        category: "AUTO_TAG",
      });
    }

    for (const r of recentSearches) {
      addUnique(r);
    }

    for (const m of matches) {
      const parts = [
        ...m.blueTeam.participants,
        ...m.redTeam.participants,
      ];
      for (const p of parts) {
        addUnique({
          riotId: `${p.riotIdGameName}#${p.riotIdTagline}`,
          platform: m.platformId,
          championId: p.championId,
          subtitle: `${p.championName} (${p.role}) • Trận ${m.matchId}`,
          category: "MATCH_PLAYER",
        });
      }
    }

    for (const f of FEATURED_RIOT_IDS) {
      addUnique(f);
    }

    if (!q) {
      return list.slice(0, 10);
    }

    return list
      .filter(
        (opt) =>
          opt.riotId.toLowerCase().includes(q) ||
          opt.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [queryInput, searchMode, platform, recentSearches, matches]);

  const triggerAiAnalysis = useCallback(
    async (
      matchToAnalyze: NormalizedMatchData,
      targetPuuid: string,
      options?: { resetPrevious?: boolean; forceRefresh?: boolean }
    ) => {
      const cacheKey = matchToAnalyze.matchId;

      if (!options?.forceRefresh && analysisCacheRef.current[cacheKey]) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setIsAnalyzing(false);
        setAnalysisError(null);
        setAnalysis(analysisCacheRef.current[cacheKey]);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsAnalyzing(true);
      setAnalysisError(null);
      if (options?.resetPrevious) {
        setAnalysis(null);
      }

      try {
        const res = await fetch("/api/analyze-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match: matchToAnalyze,
            focusPuuid: targetPuuid,
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (controller.signal.aborted) return;

        if (!res.ok) {
          setAnalysisError(data.error || "Không thể phân tích trận đấu.");
        } else if (data.analysis) {
          analysisCacheRef.current[cacheKey] = data.analysis;
          setAnalysis(data.analysis);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setAnalysisError(
          err instanceof Error
            ? err.message
            : "Lỗi kết nối tới hệ thống phân tích AI"
        );
      } finally {
        if (abortControllerRef.current === controller) {
          setIsAnalyzing(false);
        }
      }
    },
    []
  );

  const executeSearchMatchList = useCallback(
    async (
      targetQuery: string,
      targetPlatform: RiotPlatformId,
      targetQueue: "ALL" | "ARAM" | "SOLO" | "FLEX" = queueFilter
    ) => {
      const cleanedQuery = targetQuery.trim();
      if (!cleanedQuery) return;

      setIsDropdownOpen(false);
      setIsFetchingMatch(true);
      setFetchError(null);
      setFetchWarning(null);
      setSelectedMatch(null);
      setAnalysis(null);
      setHasSearchedLive(true);

      if (searchMode === "RIOT_ID") {
        setSearchedPlayerLabel(cleanedQuery);
        if (cleanedQuery.includes("#")) {
          saveRecentSearch({
            riotId: cleanedQuery,
            platform: targetPlatform,
            subtitle: `Đã tra cứu gần đây (${targetPlatform})`,
            category: "RECENT",
          });
        }
      }

      try {
        const params = new URLSearchParams({
          platform: targetPlatform,
          count: "10",
          queue: targetQueue,
        });
        if (searchMode === "RIOT_ID") {
          params.set("riotId", cleanedQuery);
        } else {
          params.set("matchId", cleanedQuery);
        }

        const res = await fetch(`/api/lol/matches?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setFetchError(
            data.error || "Lỗi khi lấy danh sách trận đấu từ Riot API."
          );
          return;
        }

        if (data.warning) {
          setFetchWarning(data.warning);
        }

        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        }
      } catch (err) {
        setFetchError(
          err instanceof Error
            ? err.message
            : "Lỗi kết nối khi lấy danh sách trận đấu."
        );
      } finally {
        setIsFetchingMatch(false);
      }
    },
    [searchMode, queueFilter, saveRecentSearch]
  );

  const handleQueueFilterChange = useCallback(
    (nextQueue: "ALL" | "ARAM" | "SOLO" | "FLEX") => {
      setQueueFilter(nextQueue);
      setFetchError(null);
      if (hasSearchedLive && searchMode === "RIOT_ID" && queryInput.trim()) {
        executeSearchMatchList(queryInput, platform, nextQueue);
      }
    },
    [hasSearchedLive, searchMode, queryInput, platform, executeSearchMatchList]
  );

  const displayedMatches = useMemo(() => {
    if (queueFilter === "ALL") return matches;
    if (queueFilter === "ARAM") {
      return matches.filter(
        (m) =>
          m.gameMode === "ARAM" ||
          m.queueName.toUpperCase().includes("ARAM")
      );
    }
    if (queueFilter === "SOLO") {
      return matches.filter((m) => m.queueName.includes("Đơn/Đôi"));
    }
    if (queueFilter === "FLEX") {
      return matches.filter((m) => m.queueName.includes("Linh Hoạt"));
    }
    return matches;
  }, [matches, queueFilter]);

  const handleOpenMatchDetail = (match: NormalizedMatchData) => {
    const primaryPlayer = findPrimaryPlayerInMatch(match, searchedPlayerLabel);
    const isDifferentMatch = selectedMatch?.matchId !== match.matchId;
    setSelectedMatch(match);
    setFocusedPuuid(primaryPlayer.puuid);
    triggerAiAnalysis(match, primaryPlayer.puuid, {
      resetPrevious: isDifferentMatch,
    });
  };

  const handleSearchMatches = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearchMatchList(queryInput, platform);
  };

  const handleSelectSuggestion = (opt: AutocompleteOption) => {
    setQueryInput(opt.riotId);
    setPlatform(opt.platform);
    setIsDropdownOpen(false);
    executeSearchMatchList(opt.riotId, opt.platform);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || autocompleteSuggestions.length === 0) {
      if (e.key === "ArrowDown") {
        setIsDropdownOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const chosen = autocompleteSuggestions[activeIndex];
      if (chosen) {
        handleSelectSuggestion(chosen);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleSelectParticipantInDetail = (
    p: ParticipantStats,
    shouldScrollToAi = false
  ) => {
    if (!selectedMatch) return;
    setFocusedPuuid(p.puuid);

    // Ensure the clicked player's card is visible in the grid
    if (
      (reviewTeamFilter === "BLUE" && p.teamId !== 100) ||
      (reviewTeamFilter === "RED" && p.teamId !== 200) ||
      (reviewTeamFilter.startsWith("ROLE_") &&
        reviewTeamFilter !== `ROLE_${p.role}`)
    ) {
      setReviewTeamFilter("LANE_VS");
    }

    // Only call API if analysis is not yet loaded for this match
    if (!analysis && !isAnalyzing) {
      triggerAiAnalysis(selectedMatch, p.puuid, { resetPrevious: false });
    }

    if (shouldScrollToAi) {
      requestAnimationFrame(() => {
        const cardEl = document.getElementById(`player-review-${p.puuid}`);
        if (cardEl) {
          cardEl.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else if (aiEvaluationRef.current) {
          aiEvaluationRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
  };

  const renderTeamTable = (
    match: NormalizedMatchData,
    team: NormalizedMatchData["blueTeam"],
    teamLabel: string,
    accentClass: string,
    borderClass: string,
    headerBgClass: string,
    maxDamageInMatch: number
  ) => {
    const sortedByMvp = [...team.participants].sort(
      (a, b) => b.mvpScore - a.mvpScore
    );
    const topPuuid = sortedByMvp[0]?.puuid;

    return (
      <div
        className={`rounded-xl bg-white border ${borderClass} overflow-hidden shadow-xs`}
      >
        <div
          className={`px-3.5 sm:px-4 py-3 ${headerBgClass} border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                team.win
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}
            >
              {team.win ? "CHIẾN THẮNG" : "THẤT BẠI"}
            </span>
            <h3
              className={`text-sm sm:text-base font-black uppercase ${accentClass}`}
            >
              {teamLabel}
            </h3>
            <span className="text-xs text-slate-600 font-medium">
              • {team.totalKills} Hạ gục • {(team.totalGold / 1000).toFixed(1)}k
              Vàng
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-700">
            {match.gameMode === "ARAM" ||
            match.queueName.toUpperCase().includes("ARAM") ? (
              <>
                <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold">
                  ❄️ Vực Gió Hú (ARAM)
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  🗼 Trụ: <strong>{team.objectives.tower}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  🏛️ Nhà lính: <strong>{team.objectives.inhibitor}</strong>
                </span>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  🐉 Rồng: <strong>{team.objectives.dragon}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  👾 Baron: <strong>{team.objectives.baron}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  🪲 Sâu: <strong>{team.objectives.horde}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                  🗼 Trụ: <strong>{team.objectives.tower}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Column Header Bar on Desktop (md+) */}
        <div className="hidden md:grid md:grid-cols-[minmax(220px,1.5fr)_minmax(115px,0.85fr)_minmax(150px,1fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_224px] md:items-center md:gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Người chơi &amp; Tướng (Bấm để xem AI)</span>
          <span>KDA / Tham gia</span>
          <span>Sát thương tướng</span>
          <span>Chỉ số lính &amp; Vàng</span>
          <span>Tầm nhìn &amp; Điểm OP</span>
          <span>Trang bị hoàn thành</span>
        </div>

        <div className="divide-y divide-slate-100">
          {team.participants.map((p) => {
            const isFocused = p.puuid === focusedPuuid;
            const isTopPerformer = p.puuid === topPuuid;
            const dmgPercent = Math.round(
              (p.totalDamageDealtToChampions / maxDamageInMatch) * 100
            );

            return (
              <div
                key={p.puuid}
                onClick={() => handleSelectParticipantInDetail(p, true)}
                className={`group p-3 sm:px-4 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-[minmax(220px,1.5fr)_minmax(115px,0.85fr)_minmax(150px,1fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_224px] md:items-center gap-3 md:gap-4 ${
                  isFocused
                    ? "bg-teal-50/90 border-l-4 border-l-teal-600"
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Col 1: Role + Avatar + Name */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <RoleIcon role={p.role} className="w-4 h-4" />
                  </div>

                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-900">
                    <img
                      src={getChampionSquareUrl(p.championId)}
                      alt={p.championName}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 px-1 text-[10px] font-bold bg-slate-900/90 text-white">
                      {p.champLevel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                        {p.riotIdGameName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        #{p.riotIdTagline}
                      </span>
                      {isTopPerformer && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                            team.win
                              ? "bg-amber-500 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {team.win ? "MVP" : "SVP"}
                        </span>
                      )}
                      {isFocused && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-600 text-white">
                          Đang xem
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="font-medium">{p.championName}</span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {p.primaryRune}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile 2x2 Grid / Desktop Columns 2..5 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:contents gap-2.5 text-xs bg-slate-50/80 md:bg-transparent p-2.5 md:p-0 rounded-lg border border-slate-100 md:border-0">
                  {/* Col 2: KDA */}
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                      {p.kills} /{" "}
                      <span className="text-rose-600">{p.deaths}</span> /{" "}
                      {p.assists}
                    </div>
                    <div className="text-[11px] text-slate-600 whitespace-nowrap">
                      {p.kda} KDA • KP {p.killParticipation}%
                    </div>
                  </div>

                  {/* Col 3: Damage */}
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                      <span className="text-slate-900 font-bold">
                        {p.totalDamageDealtToChampions.toLocaleString()}
                      </span>
                      <span className="text-slate-500 shrink-0">
                        {p.damageShare}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${dmgPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Col 4: CS & Gold */}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 whitespace-nowrap">
                      {p.cs} CS ({p.csPerMin}/p)
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium whitespace-nowrap">
                      {(p.goldEarned / 1000).toFixed(1)}k vàng
                    </div>
                  </div>

                  {/* Col 5: Vision & OP Score */}
                  <div className="min-w-0">
                    <div className="font-bold text-teal-700 whitespace-nowrap">
                      👁️ {p.visionScore} tầm nhìn
                    </div>
                    <div className="text-[11px] text-slate-600 whitespace-nowrap">
                      Điểm OP:{" "}
                      <strong className="text-slate-900">{p.mvpScore}</strong>
                    </div>
                  </div>
                </div>

                {/* Col 6: 7 Item Slots in 1 neat single row */}
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <div className="flex items-center gap-1 flex-nowrap shrink-0">
                    {p.items.map((itemId, idx) => {
                      const iconUrl = getItemIconUrl(itemId);
                      return (
                        <div
                          key={idx}
                          className={`w-7 h-7 rounded bg-slate-100 border ${
                            idx === 6
                              ? "border-amber-400 rounded-full ml-1"
                              : "border-slate-300"
                          } overflow-hidden flex items-center justify-center shrink-0`}
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
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="md:hidden text-[11px] font-bold text-teal-700 shrink-0">
                    Xem AI &darr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-3 py-4 sm:px-6 sm:py-6 lg:px-10 max-w-[1440px] mx-auto">
      {/* Page Title & Search Bar */}
      <header className="mb-5 sm:mb-6 fluid-header-container">
        <div className="pb-4 sm:pb-5 border-b border-slate-200">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-300 text-teal-800 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2">
            <BrainCircuit className="w-3.5 h-3.5 text-teal-600" />
            <span>Riot Match-V5 + AI Match Coach</span>
          </div>
          <h1 className="fluid-hero-title font-black tracking-tight text-slate-900 uppercase">
            Phân Tích Trận Đấu LMHT{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-sky-600 to-amber-600">
              Bằng Trí Tuệ Nhân Tạo (AI)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            <strong>Bước 1:</strong> Tìm kiếm{" "}
            <strong className="text-slate-900">Riot ID (Tên#Tag)</strong> để lấy
            danh sách các trận đấu gần nhất &rarr; <strong>Bước 2:</strong> Bấm
            chọn vào một trận đấu cụ thể để xem chi tiết 5v5 và phân tích bằng
            AI.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <form
            onSubmit={handleSearchMatches}
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("RIOT_ID");
                    setQueryInput("Levi#VN2");
                  }}
                  className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                    searchMode === "RIOT_ID"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Riot ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("MATCH_ID");
                    setQueryInput("VN2_489102341");
                  }}
                  className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                    searchMode === "MATCH_ID"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Match ID
                </button>
              </div>

              <div className="relative shrink-0">
                <select
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as RiotPlatformId)
                  }
                  aria-label="Chọn máy chủ Riot"
                  className="appearance-none pl-3.5 pr-9 py-2.5 rounded-lg bg-slate-50 hover:bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 cursor-pointer transition-colors"
                >
                  {PLATFORMS.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>

            {/* Autocomplete Combobox Input */}
            <div ref={comboboxRef} className="relative flex-1 min-w-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={queryInput}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                    setActiveIndex(-1);
                  }}
                  onChange={(e) => {
                    setQueryInput(e.target.value);
                    setIsDropdownOpen(true);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleInputKeyDown}
                  autoComplete="off"
                  placeholder={
                    searchMode === "RIOT_ID"
                      ? "Gõ tên hoặc chọn gợi ý (VD: Levi#VN2, Hide on bush#KR1)..."
                      : "Nhập hoặc chọn Match ID (VD: VN2_489102341)..."
                  }
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white"
                />
                {queryInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueryInput("");
                      setIsDropdownOpen(true);
                    }}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Xóa nhanh"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isDropdownOpen && autocompleteSuggestions.length > 0 && (
                <div className="scrollable-panel absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white border border-slate-300 shadow-xl max-h-[320px]">
                  <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <span>Gợi ý tự động (Bấm hoặc nhấn ↑↓ Enter)</span>
                    <span>{autocompleteSuggestions.length} kết quả</span>
                  </div>

                  <ul className="divide-y divide-slate-100">
                    {autocompleteSuggestions.map((opt, idx) => {
                      const isActive = idx === activeIndex;
                      const [namePart, tagPart] = opt.riotId.split("#");
                      return (
                        <li
                          key={`${opt.riotId}-${opt.platform}`}
                          onClick={() => handleSelectSuggestion(opt)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isActive
                              ? "bg-teal-50 text-slate-900"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {opt.championId ? (
                              <img
                                src={getChampionSquareUrl(opt.championId)}
                                alt={opt.championId}
                                width={30}
                                height={30}
                                className="w-7 h-7 rounded-md border border-slate-300 object-cover shrink-0"
                              />
                            ) : opt.category === "RECENT" ? (
                              <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                            )}

                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold truncate">
                                <span className="text-slate-900">
                                  {namePart}
                                </span>
                                {tagPart && (
                                  <span className="text-teal-600 font-mono ml-0.5">
                                    #{tagPart}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {opt.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                              {opt.platform}
                            </span>
                            {opt.category === "RECENT" && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  removeRecentSearch(opt.riotId, e)
                                }
                                title="Xóa khỏi lịch sử tìm kiếm"
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isFetchingMatch}
              className="hextech-action-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>
                {isFetchingMatch ? "Đang tải list..." : "Tìm Lịch Sử Đấu"}
              </span>
            </button>
          </form>

          {/* Queue Mode Filter Bar (ALL / ARAM / Ranked Solo / Ranked Flex) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                Chế độ chơi:
              </span>
              {(
                [
                  { id: "ALL", label: "🎮 Tất Cả Chế Độ" },
                  { id: "ARAM", label: "❄️ Lịch Sử ARAM (Vực Gió Hú)" },
                  { id: "SOLO", label: "🏆 Xếp Hạng Đơn/Đôi" },
                  { id: "FLEX", label: "⚔️ Xếp Hạng Linh Hoạt" },
                ] as const
              ).map((tab) => {
                const isActive = queueFilter === tab.id;
                const isAramTab = tab.id === "ARAM";
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={isFetchingMatch}
                    onClick={() => handleQueueFilterChange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                      isActive
                        ? isAramTab
                          ? "bg-gradient-to-r from-cyan-600 to-sky-600 text-white border-cyan-700 shadow-xs"
                          : "bg-teal-600 text-white border-teal-700 shadow-xs"
                        : isAramTab
                        ? "bg-cyan-50/70 text-cyan-800 border-cyan-200 hover:bg-cyan-100"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-500">
              Bấm <strong>❄️ Lịch Sử ARAM</strong> để lọc hoặc lấy 10 trận ARAM gần nhất từ Riot API
            </span>
          </div>
        </div>

        {/* Notices */}
        {fetchWarning && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchWarning}</span>
          </div>
        )}
        {fetchError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* STEP 1: RECENT MATCH HISTORY LIST VIEW (When no match is selected yet) */}
      {/* ===================================================================== */}
      {!selectedMatch ? (
        <section className="space-y-3.5 sm:space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-teal-600" />
              <h2 className="text-sm sm:text-lg font-black uppercase tracking-wider text-slate-900">
                {queueFilter === "ARAM"
                  ? `Lịch Sử Đấu ARAM - Vực Gió Hú (${displayedMatches.length} trận)`
                  : queueFilter === "SOLO"
                  ? `Lịch Sử Xếp Hạng Đơn/Đôi (${displayedMatches.length} trận)`
                  : queueFilter === "FLEX"
                  ? `Lịch Sử Xếp Hạng Linh Hoạt (${displayedMatches.length} trận)`
                  : `Danh Sách Trận Đấu Gần Nhất (${displayedMatches.length} trận)`}
              </h2>
            </div>
            <span className="text-xs text-slate-600 font-medium">
              👉 Bấm vào một trận đấu bất kỳ bên dưới để xem bảng điểm 5v5 &amp;
              kích hoạt AI phân tích
            </span>
          </div>

          <div className="space-y-3">
            {displayedMatches.map((match) => {
              const primaryP = findPrimaryPlayerInMatch(
                match,
                searchedPlayerLabel
              );
              const isWin = primaryP.win;
              const isAramMatch =
                match.gameMode === "ARAM" ||
                match.queueName.toUpperCase().includes("ARAM");

              return (
                <div
                  key={match.matchId}
                  onClick={() => handleOpenMatchDetail(match)}
                  className={`champ-card group rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 sm:gap-4 p-3.5 sm:p-4 bg-white shadow-xs hover:shadow-md ${
                    isWin
                      ? "border-l-4 border-l-emerald-500 border-slate-200 hover:border-teal-500"
                      : "border-l-4 border-l-rose-500 border-slate-200 hover:border-amber-500"
                  }`}
                >
                  {/* Left: Match Result + Queue + Duration */}
                  <div className="flex sm:flex-row lg:flex-col justify-between gap-2 min-w-[165px] border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                            isWin
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {isWin ? "CHIẾN THẮNG" : "THẤT BẠI"}
                        </span>
                        {isAramMatch && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-300">
                            ❄️ ARAM
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">
                        {match.queueName}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 shrink-0">
                      <span>⏱️ {formatDuration(match.gameDurationSeconds)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(match.gameStartTimestamp)}</span>
                    </div>
                  </div>

                  {/* Middle-Left: Primary Player Champion + KDA + Items */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-1">
                    <div className="flex items-center gap-3 min-w-[185px]">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-900">
                        <img
                          src={getChampionSquareUrl(primaryP.championId)}
                          alt={primaryP.championName}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 px-1.5 py-0.2 text-[10px] font-black bg-slate-900/90 text-white">
                          {primaryP.champLevel}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900">
                            {primaryP.championName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-700">
                            {primaryP.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {primaryP.riotIdGameName}#{primaryP.riotIdTagline}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Điểm OP:{" "}
                          <strong className="text-slate-900">
                            {primaryP.mvpScore}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* KDA & Stats */}
                    <div className="min-w-[130px]">
                      <div className="text-sm sm:text-base font-black text-slate-900">
                        {primaryP.kills} /{" "}
                        <span className="text-rose-600">{primaryP.deaths}</span>{" "}
                        / {primaryP.assists}
                      </div>
                      <div className="text-xs text-teal-700 font-bold">
                        {primaryP.kda} KDA • KP {primaryP.killParticipation}%
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {primaryP.cs} CS ({primaryP.csPerMin}/p) •{" "}
                        {(primaryP.goldEarned / 1000).toFixed(1)}k vàng
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {primaryP.items.map((itemId, idx) => {
                        const iconUrl = getItemIconUrl(itemId);
                        return (
                          <div
                            key={idx}
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded bg-slate-100 border ${
                              idx === 6
                                ? "border-amber-400 rounded-full ml-1"
                                : "border-slate-300"
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
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Middle-Right: Mini 10-player roster preview */}
                  <div className="hidden xl:grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] min-w-[250px] border-l border-slate-200 pl-4">
                    <div className="space-y-1">
                      {match.blueTeam.participants.map((bp) => (
                        <div
                          key={bp.puuid}
                          className="flex items-center gap-1.5 truncate"
                        >
                          <img
                            src={getChampionSquareUrl(bp.championId)}
                            alt={bp.championName}
                            width={16}
                            height={16}
                            loading="lazy"
                            className="w-4 h-4 rounded-xs object-cover shrink-0"
                          />
                          <span className="truncate text-sky-800 font-medium">
                            {bp.riotIdGameName}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {match.redTeam.participants.map((rp) => (
                        <div
                          key={rp.puuid}
                          className="flex items-center gap-1.5 truncate"
                        >
                          <img
                            src={getChampionSquareUrl(rp.championId)}
                            alt={rp.championName}
                            width={16}
                            height={16}
                            loading="lazy"
                            className="w-4 h-4 rounded-xs object-cover shrink-0"
                          />
                          <span className="truncate text-rose-800 font-medium">
                            {rp.riotIdGameName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right CTA: View Detail & AI Analysis */}
                  <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-teal-600 text-white group-hover:bg-teal-700 transition-colors shadow-xs">
                      <BrainCircuit className="w-4 h-4" />
                      <span>Chi Tiết &amp; Phân Tích AI</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* ===================================================================== */
        /* STEP 2: MATCH DETAIL & AI ANALYSIS VIEW                               */
        /* ===================================================================== */
        <div>
          {/* Back to Match List + Match Switcher Bar */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setSelectedMatch(null)}
              className="hextech-action-btn inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider bg-white text-teal-700 border border-teal-400 hover:bg-teal-50 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Danh Sách Trận Đấu ({matches.length})</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-600 shrink-0">
                Chuyển nhanh:
              </span>
              {matches.map((m) => (
                <button
                  key={m.matchId}
                  type="button"
                  onClick={() => handleOpenMatchDetail(m)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border shrink-0 cursor-pointer ${
                    selectedMatch.matchId === m.matchId
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                  }`}
                >
                  {m.matchId}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Image Status Notice */}
          {copyStatusText && (
            <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-300 text-xs sm:text-sm font-bold text-teal-900 flex items-center justify-between gap-2 shadow-2xs">
              <span>{copyStatusText}</span>
              <button
                type="button"
                onClick={() => setCopyStatusText(null)}
                className="p-1 rounded hover:bg-teal-100 text-teal-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Capturable Match Detail Container */}
          <div ref={matchDetailCaptureRef}>
            {/* Match Banner Summary */}
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded bg-teal-50 border border-teal-200 text-xs font-mono font-bold text-teal-800">
                  #{selectedMatch.matchId}
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedMatch.queueName}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Thời lượng:{" "}
                    <strong className="text-slate-900">
                      {formatDuration(selectedMatch.gameDurationSeconds)}
                    </strong>{" "}
                    • Phiên bản:{" "}
                    <strong className="text-slate-900">
                      {selectedMatch.gameVersion}
                    </strong>
                  </p>
                </div>
              </div>

              <div
                data-export-ignore="true"
                className="flex flex-wrap items-center justify-start sm:justify-end gap-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleCopyElementImage(
                      matchDetailCaptureRef.current,
                      "FULL_PAGE",
                      `Toàn trang trận ${selectedMatch.matchId}`,
                      `lol-full-match-${selectedMatch.matchId}.png`
                    )
                  }
                  disabled={copyingTargetId !== null}
                  className="hextech-action-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                >
                  {copyingTargetId === "FULL_PAGE" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : copiedTargetId === "FULL_PAGE" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copyingTargetId === "FULL_PAGE"
                      ? "Đang chụp..."
                      : copiedTargetId === "FULL_PAGE"
                      ? "Đã Copy Ảnh!"
                      : "Copy Ảnh Toàn Trang"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadElementImage(
                      matchDetailCaptureRef.current,
                      "DOWNLOAD_FULL",
                      `Toàn trang trận ${selectedMatch.matchId}`,
                      `lol-full-match-${selectedMatch.matchId}.png`
                    )
                  }
                  disabled={copyingTargetId !== null}
                  title="Tải ảnh PNG toàn trang về máy"
                  className="hextech-action-btn inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    triggerAiAnalysis(selectedMatch, focusedPuuid, {
                      forceRefresh: true,
                      resetPrevious: false,
                    })
                  }
                  disabled={isAnalyzing}
                  className="hextech-action-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isAnalyzing ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {isAnalyzing
                      ? "AI Đang Phân Tích..."
                      : "Phân Tích Lại Bằng AI"}
                  </span>
                </button>
              </div>
            </div>

            {/* Main Content Grid: Left Scoreboards (5v5) + Right AI Coach Report */}
            {(() => {
              const allParts = [
                ...selectedMatch.blueTeam.participants,
                ...selectedMatch.redTeam.participants,
              ];
              const maxDmg = Math.max(
                1,
                ...allParts.map((p) => p.totalDamageDealtToChampions)
              );
              const focusedPlayer =
                allParts.find((p) => p.puuid === focusedPuuid) || allParts[0];

              return (
                <div className="space-y-6">
                  {/* Top Full-Width Section: Blue Team & Red Team 5v5 Scoreboards */}
                  <div className="space-y-4">
                    {renderTeamTable(
                      selectedMatch,
                      selectedMatch.blueTeam,
                      "Đội Xanh (Blue Team)",
                      "text-sky-700",
                      "border-sky-200",
                      "bg-sky-50/70",
                      maxDmg
                    )}
                    {renderTeamTable(
                      selectedMatch,
                      selectedMatch.redTeam,
                      "Đội Đỏ (Red Team)",
                      "text-rose-700",
                      "border-rose-200",
                      "bg-rose-50/70",
                      maxDmg
                    )}
                  </div>

                  {/* Bottom Full-Width Section: AI Match Analysis Report (Scroll target when clicking a champion) */}
                  <div ref={aiEvaluationRef} className="scroll-mt-20">
                    <section className="p-4 sm:p-6 rounded-xl bg-white border-2 border-teal-500/40 shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-teal-600" />
                          <h2 className="text-sm sm:text-lg font-black uppercase tracking-wider text-slate-900">
                            Báo Cáo Phân Tích Từ AI Coach (Toàn Trận &amp; Cả 10
                            Người Chơi)
                          </h2>
                          {analysis?.usedEndpoint && (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-800">
                              ⚡ {analysis.usedEndpoint}
                            </span>
                          )}
                        </div>
                        <div
                          data-export-ignore="true"
                          className="flex flex-wrap items-center gap-2"
                        >
                          {isAnalyzing && (
                            <span className="text-xs font-bold text-teal-600 animate-pulse">
                              Đang phân tích cả 10 thành viên...
                            </span>
                          )}
                          {analysis && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyElementImage(
                                  aiEvaluationRef.current,
                                  "AI_SECTION",
                                  `Báo cáo AI trận ${selectedMatch.matchId}`,
                                  `lol-ai-report-${selectedMatch.matchId}.png`
                                )
                              }
                              disabled={copyingTargetId !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 cursor-pointer transition-colors"
                            >
                              {copyingTargetId === "AI_SECTION" ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : copiedTargetId === "AI_SECTION" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Camera className="w-3.5 h-3.5 text-teal-700" />
                              )}
                              <span>
                                {copyingTargetId === "AI_SECTION"
                                  ? "Đang chụp..."
                                  : copiedTargetId === "AI_SECTION"
                                  ? "Đã Copy Báo Cáo AI!"
                                  : "Copy Ảnh Báo Cáo AI"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                    {isAnalyzing && !analysis ? (
                      <div className="py-12 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-slate-800">
                          AI Coach đang tổng hợp dữ liệu và đánh giá chi tiết cả{" "}
                          <span className="text-teal-700">
                            10 thành viên (Đội Xanh &amp; Đội Đỏ)
                          </span>
                          ...
                        </p>
                      </div>
                    ) : analysisError ? (
                      <div className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900">
                        {analysisError}
                      </div>
                    ) : analysis ? (
                      <div
                        className={`space-y-6 text-xs sm:text-sm transition-opacity duration-200 ${
                          isAnalyzing ? "opacity-60" : "opacity-100"
                        }`}
                      >
                        {/* Part 1: Match Overview + MVP/SVP + 5-Lane Comparisons + Macro */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                          <div className="lg:col-span-6 space-y-4">
                            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                <Sparkles className="w-4 h-4 text-teal-600" />
                                <span>
                                  Tổng Quan Cục Diện &amp; Điều Kiện Thắng
                                </span>
                              </div>
                              <p className="text-slate-800 leading-relaxed">
                                {analysis.overview}
                              </p>
                              <p className="text-xs text-teal-800 pt-1.5 border-t border-slate-200">
                                <strong>Điểm bước ngoặt:</strong>{" "}
                                {analysis.winConditionSummary}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-800 mb-1">
                                  <Trophy className="w-4 h-4 text-amber-600" />
                                  <span>
                                    MVP Trận Đấu ({analysis.mvpPlayer.role})
                                  </span>
                                </div>
                                <div className="font-bold text-slate-900">
                                  {analysis.mvpPlayer.champion} —{" "}
                                  {analysis.mvpPlayer.name}
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                  {analysis.mvpPlayer.reason}
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200">
                                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-800 mb-1">
                                  <Award className="w-4 h-4 text-purple-600" />
                                  <span>
                                    SVP Đội Thua ({analysis.svpPlayer.role})
                                  </span>
                                </div>
                                <div className="font-bold text-slate-900">
                                  {analysis.svpPlayer.champion} —{" "}
                                  {analysis.svpPlayer.name}
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                  {analysis.svpPlayer.reason}
                                </p>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-amber-600" />
                                <span>
                                  Đánh Giá Macro &amp; Kiểm Soát Bản Đồ
                                </span>
                              </h3>
                              <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                                {analysis.macroInsights.map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="lg:col-span-6 space-y-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Swords className="w-4 h-4 text-teal-600" />
                              <span>
                                So Sánh Đối Đầu 5 Đường (TOP / JG / MID / AD /
                                SP)
                              </span>
                            </h3>
                            <div className="space-y-2">
                              {analysis.laneComparisons.map((lc) => (
                                <div
                                  key={lc.role}
                                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                    <span className="font-black text-slate-800 flex items-center gap-1.5">
                                      <RoleIcon
                                        role={lc.role}
                                        className="w-3.5 h-3.5 text-slate-700"
                                      />
                                      <span>
                                        {lc.role}: {lc.blueChampion} vs{" "}
                                        {lc.redChampion}
                                      </span>
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        lc.winnerTeam === 100
                                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                                          : lc.winnerTeam === 200
                                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {lc.winnerTeam === 100
                                        ? "Đội Xanh Thắng Đường"
                                        : lc.winnerTeam === 200
                                        ? "Đội Đỏ Thắng Đường"
                                        : "Cân Bằng"}
                                    </span>
                                  </div>
                                  <p className="text-slate-700">{lc.verdict}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Part 2: Head-to-Head Same-Lane Comparisons & All 10 Players Detailed AI Evaluations */}
                        <div className="pt-5 border-t border-slate-200 space-y-4">
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                            <div>
                              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                                ⚔️ So Sánh Đối Đầu Cùng Đường &amp; Đánh Giá Cả
                                10 Thành Viên
                              </h3>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Đặt 2 người chơi cùng 1 đường (Đội Xanh bên trái
                                vs Đội Đỏ bên phải) đối diện nhau kèm thanh so
                                sánh chỉ số &amp; đánh giá AI!
                              </p>
                            </div>

                            {/* Lane & Team Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start xl:self-auto">
                              <button
                                type="button"
                                onClick={() => setReviewTeamFilter("LANE_VS")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-colors ${
                                  reviewTeamFilter === "LANE_VS"
                                    ? "bg-teal-600 text-white shadow-2xs"
                                    : "text-slate-700 hover:text-slate-900"
                                }`}
                              >
                                ⚔️ Cả 5 Đường (10)
                              </button>
                              {(
                                [
                                  { id: "ROLE_TOP", label: "TOP" },
                                  { id: "ROLE_JG", label: "JG" },
                                  { id: "ROLE_MID", label: "MID" },
                                  { id: "ROLE_AD", label: "AD" },
                                  { id: "ROLE_SP", label: "SP" },
                                ] as const
                              ).map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setReviewTeamFilter(tab.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    reviewTeamFilter === tab.id
                                      ? "bg-amber-500 text-white shadow-2xs"
                                      : "text-slate-700 hover:bg-white"
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                              <span className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:inline-block" />
                              <button
                                type="button"
                                onClick={() => setReviewTeamFilter("BLUE")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                  reviewTeamFilter === "BLUE"
                                    ? "bg-sky-600 text-white shadow-2xs"
                                    : "text-sky-800 hover:bg-white"
                                }`}
                              >
                                Đội Xanh (5)
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewTeamFilter("RED")}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                  reviewTeamFilter === "RED"
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : "text-rose-800 hover:bg-white"
                                }`}
                              >
                                Đội Đỏ (5)
                              </button>
                            </div>
                          </div>

                          {/* Quick 10-Player Jump Bar */}
                          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              ⚡ Bấm nhanh để cuộn tới thẻ đánh giá của thành
                              viên:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
                              {allParts.map((member) => {
                                const isCurrent = member.puuid === focusedPuuid;
                                return (
                                  <button
                                    key={member.puuid}
                                    type="button"
                                    onClick={() =>
                                      handleSelectParticipantInDetail(
                                        member,
                                        true
                                      )
                                    }
                                    title={`${member.riotIdGameName}#${member.riotIdTagline} (${member.championName} - ${member.role})`}
                                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                      isCurrent
                                        ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                                        : member.teamId === 100
                                        ? "bg-sky-50/80 border-sky-200 text-slate-800 hover:border-sky-400"
                                        : "bg-rose-50/80 border-rose-200 text-slate-800 hover:border-rose-400"
                                    }`}
                                  >
                                    <img
                                      src={getChampionSquareUrl(
                                        member.championId
                                      )}
                                      alt={member.championName}
                                      width={22}
                                      height={22}
                                      className="w-5 h-5 rounded object-cover shrink-0"
                                    />
                                    <span className="text-[11px] font-bold truncate">
                                      {member.riotIdGameName}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Render Player Card Helper + Head-to-Head Lane Pairs */}
                          {(() => {
                            const reviewsList =
                              analysis.allPlayerReviews &&
                              analysis.allPlayerReviews.length > 0
                                ? analysis.allPlayerReviews
                                : [
                                    {
                                      ...analysis.focusedPlayerReview,
                                      puuid: focusedPlayer.puuid,
                                      championId: focusedPlayer.championId,
                                      teamId: focusedPlayer.teamId,
                                      win: focusedPlayer.win,
                                      kdaText: `${focusedPlayer.kills}/${focusedPlayer.deaths}/${focusedPlayer.assists} (${focusedPlayer.kda} KDA)`,
                                      mvpScore: focusedPlayer.mvpScore,
                                    },
                                  ];

                            const renderPlayerEvaluationCard = (
                              rev: (typeof reviewsList)[number],
                              idx: number
                            ) => {
                              const revPuuid =
                                rev.puuid || `${rev.playerName}-${idx}`;
                              const isSelected = revPuuid === focusedPuuid;
                              const isBlue = rev.teamId === 100;
                              const participantStat = allParts.find(
                                (p) => p.puuid === rev.puuid
                              );
                              const champId =
                                rev.championId ||
                                participantStat?.championId ||
                                rev.champion;

                              return (
                                <article
                                  key={revPuuid}
                                  id={`player-review-${revPuuid}`}
                                  onClick={() => setFocusedPuuid(revPuuid)}
                                  className={`scroll-mt-24 p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 h-full ${
                                    isSelected
                                      ? "bg-gradient-to-b from-teal-50/90 to-white border-2 border-teal-500 ring-2 ring-teal-500/20 shadow-md"
                                      : isBlue
                                      ? "bg-gradient-to-b from-sky-50/40 to-white border-sky-200 hover:border-sky-400 shadow-xs"
                                      : "bg-gradient-to-b from-rose-50/40 to-white border-rose-200 hover:border-rose-400 shadow-xs"
                                  }`}
                                >
                                  <div className="space-y-3.5">
                                    {/* Card Header: Avatar + Name + Team/Role + AI Grade */}
                                    <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-slate-200">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-300 shrink-0 bg-slate-900">
                                          <img
                                            src={getChampionSquareUrl(champId)}
                                            alt={rev.champion}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                          />
                                          <span className="absolute bottom-0 right-0 px-1 py-0.2 text-[9px] font-black bg-slate-900/90 text-white">
                                            {rev.role}
                                          </span>
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                isBlue
                                                  ? "bg-sky-100 text-sky-800 border border-sky-300"
                                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                                              }`}
                                            >
                                              {isBlue ? "Đội Xanh" : "Đội Đỏ"}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                rev.win
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : "bg-slate-200 text-slate-700"
                                              }`}
                                            >
                                              {rev.win ? "Thắng" : "Thua"}
                                            </span>
                                            {isSelected && (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-teal-600 text-white">
                                                Đang chọn
                                              </span>
                                            )}
                                          </div>

                                          <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                                            {rev.playerName}
                                          </h4>

                                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                                            <span className="font-bold text-slate-800">
                                              {rev.champion} ({rev.role})
                                            </span>
                                            <span>•</span>
                                            <span className="font-bold text-teal-700">
                                              {rev.kdaText ||
                                                (participantStat
                                                  ? `${participantStat.kills}/${participantStat.deaths}/${participantStat.assists} (${participantStat.kda} KDA)`
                                                  : "")}
                                            </span>
                                            {participantStat && (
                                              <>
                                                <span>•</span>
                                                <span>
                                                  ST:{" "}
                                                  <strong>
                                                    {participantStat.totalDamageDealtToChampions.toLocaleString()}
                                                  </strong>
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          data-export-ignore="true"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const cardDom =
                                              document.getElementById(
                                                `player-review-${revPuuid}`
                                              );
                                            handleCopyElementImage(
                                              cardDom,
                                              `CARD_${revPuuid}`,
                                              `${rev.playerName} (${rev.champion})`,
                                              `lol-player-${rev.champion}-${selectedMatch.matchId}.png`
                                            );
                                          }}
                                          disabled={copyingTargetId !== null}
                                          title="Copy ảnh thẻ đánh giá của thành viên này"
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-[11px] font-bold text-slate-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          {copyingTargetId ===
                                          `CARD_${revPuuid}` ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                          ) : copiedTargetId ===
                                            `CARD_${revPuuid}` ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          ) : (
                                            <Camera className="w-3.5 h-3.5 text-teal-700" />
                                          )}
                                          <span className="hidden sm:inline">
                                            {copiedTargetId ===
                                            `CARD_${revPuuid}`
                                              ? "Đã Copy!"
                                              : "Copy Thẻ"}
                                          </span>
                                        </button>

                                        <div className="text-center px-3 py-1 rounded-lg bg-teal-50 border border-teal-300 shrink-0">
                                          <span className="block text-[10px] font-bold uppercase text-teal-700">
                                            Hạng AI
                                          </span>
                                          <span className="text-base sm:text-lg font-black text-teal-900">
                                            {rev.grade}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Opening Summary */}
                                    {rev.summary && (
                                      <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                                        {rev.summary}
                                      </p>
                                    )}

                                    {/* ✨ Điểm mạnh */}
                                    <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200">
                                      <h5 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5 mb-1.5">
                                        <span>✨ Điểm mạnh</span>
                                      </h5>
                                      <ul className="space-y-1 text-xs text-slate-800 leading-relaxed">
                                        {rev.strengths.map((s, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-emerald-600 font-bold shrink-0">
                                              -
                                            </span>
                                            <span>{s}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* 💡 Điểm cần cải thiện */}
                                    <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200">
                                      <h5 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 mb-1.5">
                                        <span>💡 Điểm cần cải thiện</span>
                                      </h5>
                                      <ul className="space-y-1 text-xs text-slate-800 leading-relaxed">
                                        {rev.weaknesses.map((w, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-amber-600 font-bold shrink-0">
                                              -
                                            </span>
                                            <span>{w}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* 🎮 Lời khuyên cải thiện */}
                                    <div className="p-3 rounded-lg bg-sky-50/80 border border-sky-200">
                                      <h5 className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5 mb-1.5">
                                        <span>🎮 Lời khuyên cải thiện</span>
                                      </h5>
                                      <ul className="space-y-1 text-xs text-slate-800 leading-relaxed">
                                        {rev.actionableAdvice.map((adv, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-sky-600 font-bold shrink-0">
                                              -
                                            </span>
                                            <span>{adv}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </article>
                              );
                            };

                            // Team-only filter mode (Blue 5 or Red 5)
                            if (
                              reviewTeamFilter === "BLUE" ||
                              reviewTeamFilter === "RED"
                            ) {
                              const teamReviews = reviewsList.filter((rev) =>
                                reviewTeamFilter === "BLUE"
                                  ? rev.teamId === 100
                                  : rev.teamId === 200
                              );
                              return (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                                  {teamReviews.map((rev, idx) =>
                                    renderPlayerEvaluationCard(rev, idx)
                                  )}
                                </div>
                              );
                            }

                            // Head-to-Head Same-Lane Comparison Mode (Default: All 5 Lanes or Specific Lane)
                            const LANE_META = [
                              { role: "TOP" as const, label: "Đường Trên (TOP)" },
                              { role: "JG" as const, label: "Đi Rừng (JG)" },
                              { role: "MID" as const, label: "Đường Giữa (MID)" },
                              { role: "AD" as const, label: "Xạ Thủ (AD)" },
                              { role: "SP" as const, label: "Hỗ Trợ (SP)" },
                            ];

                            const activeLanes = LANE_META.filter((lm) =>
                              reviewTeamFilter === "LANE_VS"
                                ? true
                                : reviewTeamFilter === `ROLE_${lm.role}`
                            );

                            return (
                              <div className="space-y-6">
                                {activeLanes.map((lm, laneIdx) => {
                                  const blueRev = reviewsList.find(
                                    (r) =>
                                      r.teamId === 100 && r.role === lm.role
                                  );
                                  const redRev = reviewsList.find(
                                    (r) =>
                                      r.teamId === 200 && r.role === lm.role
                                  );
                                  const blueStat =
                                    selectedMatch.blueTeam.participants.find(
                                      (p) => p.role === lm.role
                                    );
                                  const redStat =
                                    selectedMatch.redTeam.participants.find(
                                      (p) => p.role === lm.role
                                    );
                                  const laneComp =
                                    analysis.laneComparisons.find(
                                      (lc) => lc.role === lm.role
                                    );

                                  if (!blueRev && !redRev) return null;

                                  const bGold = blueStat?.goldEarned || 0;
                                  const rGold = redStat?.goldEarned || 0;
                                  const totalGoldPair = Math.max(
                                    1,
                                    bGold + rGold
                                  );
                                  const bGoldPct = Math.round(
                                    (bGold / totalGoldPair) * 100
                                  );
                                  const goldGap = Math.abs(bGold - rGold);

                                  const bDmg =
                                    blueStat?.totalDamageDealtToChampions || 0;
                                  const rDmg =
                                    redStat?.totalDamageDealtToChampions || 0;
                                  const totalDmgPair = Math.max(1, bDmg + rDmg);
                                  const bDmgPct = Math.round(
                                    (bDmg / totalDmgPair) * 100
                                  );
                                  const dmgGap = Math.abs(bDmg - rDmg);

                                  const laneContainerId = `lane-matchup-${lm.role}`;

                                  return (
                                    <div
                                      key={lm.role}
                                      id={laneContainerId}
                                      className="p-3.5 sm:p-5 rounded-2xl bg-slate-50/90 border-2 border-slate-200 space-y-4 shadow-xs"
                                    >
                                      {/* Head-to-Head Lane Comparison Banner */}
                                      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-black uppercase tracking-wider">
                                              <RoleIcon
                                                role={lm.role}
                                                className="w-3.5 h-3.5"
                                              />
                                              <span>Kèo Đấu {lm.label}</span>
                                            </span>

                                            {blueStat && redStat && (
                                              <span className="text-xs sm:text-sm font-black text-slate-900">
                                                <span className="text-sky-700">
                                                  {blueStat.championName} (
                                                  {blueStat.riotIdGameName})
                                                </span>{" "}
                                                <span className="text-amber-600 mx-1">
                                                  ⚡ VS ⚡
                                                </span>{" "}
                                                <span className="text-rose-700">
                                                  {redStat.championName} (
                                                  {redStat.riotIdGameName})
                                                </span>
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2">
                                            {laneComp && (
                                              <span
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase ${
                                                  laneComp.winnerTeam === 100
                                                    ? "bg-sky-100 text-sky-800 border border-sky-300"
                                                    : laneComp.winnerTeam ===
                                                      200
                                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                    : "bg-slate-100 text-slate-700 border border-slate-300"
                                                }`}
                                              >
                                                {laneComp.winnerTeam === 100
                                                  ? "🏆 Đội Xanh Thắng Đường"
                                                  : laneComp.winnerTeam === 200
                                                  ? "🏆 Đội Đỏ Thắng Đường"
                                                  : "⚖️ Kèo Đấu Cân Bằng"}
                                              </span>
                                            )}

                                            <button
                                              type="button"
                                              data-export-ignore="true"
                                              onClick={() => {
                                                const laneEl =
                                                  document.getElementById(
                                                    laneContainerId
                                                  );
                                                handleCopyElementImage(
                                                  laneEl,
                                                  `LANE_${lm.role}`,
                                                  `Kèo ${lm.label} (${blueStat?.championName} vs ${redStat?.championName})`,
                                                  `lol-lane-${lm.role}-${selectedMatch.matchId}.png`
                                                );
                                              }}
                                              disabled={
                                                copyingTargetId !== null
                                              }
                                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                              {copyingTargetId ===
                                              `LANE_${lm.role}` ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                              ) : copiedTargetId ===
                                                `LANE_${lm.role}` ? (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                              ) : (
                                                <Camera className="w-3 h-3 text-amber-700" />
                                              )}
                                              <span>
                                                {copiedTargetId ===
                                                `LANE_${lm.role}`
                                                  ? "Đã Copy Kèo Này!"
                                                  : "Copy Kèo Đường Này"}
                                              </span>
                                            </button>
                                          </div>
                                        </div>

                                        {/* Dual Visual Stat Comparison Bars (Blue vs Red) */}
                                        {blueStat && redStat && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                                            {/* Gold Bar */}
                                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] font-bold">
                                                <span
                                                  className={
                                                    bGold >= rGold
                                                      ? "text-sky-700 font-black"
                                                      : "text-slate-600"
                                                  }
                                                >
                                                  💰{" "}
                                                  {bGold.toLocaleString()} vàng
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
                                                  Chênh lệch vàng:{" "}
                                                  <strong
                                                    className={
                                                      bGold > rGold
                                                        ? "text-sky-700"
                                                        : rGold > bGold
                                                        ? "text-rose-700"
                                                        : "text-slate-700"
                                                    }
                                                  >
                                                    +{goldGap.toLocaleString()}
                                                  </strong>
                                                </span>
                                                <span
                                                  className={
                                                    rGold >= bGold
                                                      ? "text-rose-700 font-black"
                                                      : "text-slate-600"
                                                  }
                                                >
                                                  {rGold.toLocaleString()} vàng
                                                  💰
                                                </span>
                                              </div>
                                              <div className="w-full h-2.5 rounded-full bg-rose-500 overflow-hidden flex">
                                                <div
                                                  className="h-full bg-sky-500 border-r-2 border-white"
                                                  style={{
                                                    width: `${bGoldPct}%`,
                                                  }}
                                                />
                                              </div>
                                            </div>

                                            {/* Damage Bar */}
                                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] font-bold">
                                                <span
                                                  className={
                                                    bDmg >= rDmg
                                                      ? "text-sky-700 font-black"
                                                      : "text-slate-600"
                                                  }
                                                >
                                                  ⚔️ {bDmg.toLocaleString()} ST (
                                                  {blueStat.damageShare}%)
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
                                                  Hơn sát thương:{" "}
                                                  <strong
                                                    className={
                                                      bDmg > rDmg
                                                        ? "text-sky-700"
                                                        : rDmg > bDmg
                                                        ? "text-rose-700"
                                                        : "text-slate-700"
                                                    }
                                                  >
                                                    +{dmgGap.toLocaleString()}
                                                  </strong>
                                                </span>
                                                <span
                                                  className={
                                                    rDmg >= bDmg
                                                      ? "text-rose-700 font-black"
                                                      : "text-slate-600"
                                                  }
                                                >
                                                  {rDmg.toLocaleString()} ST (
                                                  {redStat.damageShare}%) ⚔️
                                                </span>
                                              </div>
                                              <div className="w-full h-2.5 rounded-full bg-rose-500 overflow-hidden flex">
                                                <div
                                                  className="h-full bg-sky-500 border-r-2 border-white"
                                                  style={{
                                                    width: `${bDmgPct}%`,
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Quick 4-Metric Head-to-Head Strip + AI Verdict */}
                                        {blueStat && redStat && (
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                              <span
                                                className={
                                                  blueStat.kda >= redStat.kda
                                                    ? "font-black text-sky-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                {blueStat.kills}/
                                                {blueStat.deaths}/
                                                {blueStat.assists}
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                KDA
                                              </span>
                                              <span
                                                className={
                                                  redStat.kda >= blueStat.kda
                                                    ? "font-black text-rose-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                {redStat.kills}/{redStat.deaths}
                                                /{redStat.assists}
                                              </span>
                                            </div>

                                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                              <span
                                                className={
                                                  blueStat.cs >= redStat.cs
                                                    ? "font-black text-sky-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                {blueStat.cs} ({blueStat.csPerMin}
                                                /p)
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                Lính CS
                                              </span>
                                              <span
                                                className={
                                                  redStat.cs >= blueStat.cs
                                                    ? "font-black text-rose-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                {redStat.cs} ({redStat.csPerMin}
                                                /p)
                                              </span>
                                            </div>

                                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                              <span
                                                className={
                                                  blueStat.visionScore >=
                                                  redStat.visionScore
                                                    ? "font-black text-sky-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                👁️ {blueStat.visionScore} (
                                                {blueStat.visionWardsBoughtInGame ??
                                                  0}{" "}
                                                mắt tím)
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                Tầm nhìn
                                              </span>
                                              <span
                                                className={
                                                  redStat.visionScore >=
                                                  blueStat.visionScore
                                                    ? "font-black text-rose-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                ({redStat.visionWardsBoughtInGame ??
                                                  0}{" "}
                                                mắt tím) {redStat.visionScore}{" "}
                                                👁️
                                              </span>
                                            </div>

                                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                              <span
                                                className={
                                                  blueStat.mvpScore >=
                                                  redStat.mvpScore
                                                    ? "font-black text-sky-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                OP {blueStat.mvpScore} (
                                                {blueRev?.grade})
                                              </span>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                Điểm AI
                                              </span>
                                              <span
                                                className={
                                                  redStat.mvpScore >=
                                                  blueStat.mvpScore
                                                    ? "font-black text-rose-700"
                                                    : "text-slate-600"
                                                }
                                              >
                                                ({redRev?.grade}) OP{" "}
                                                {redStat.mvpScore}
                                              </span>
                                            </div>
                                          </div>
                                        )}

                                        {laneComp?.verdict && (
                                          <p className="text-xs text-slate-700 bg-teal-50/60 px-3 py-2 rounded-lg border border-teal-200/80">
                                            <strong className="text-teal-900">
                                              Nhận xét kèo đấu {lm.role}:
                                            </strong>{" "}
                                            {laneComp.verdict}
                                          </p>
                                        )}
                                      </div>

                                      {/* 2-Column Side-by-Side Player Cards: Left = Blue Team, Right = Red Team */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
                                        {blueRev ? (
                                          renderPlayerEvaluationCard(
                                            blueRev,
                                            laneIdx * 2
                                          )
                                        ) : (
                                          <div />
                                        )}
                                        {redRev ? (
                                          renderPlayerEvaluationCard(
                                            redRev,
                                            laneIdx * 2 + 1
                                          )
                                        ) : (
                                          <div />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              </div>
            );
          })()}
          </div>
        </div>
      )}
    </div>
  );
}
