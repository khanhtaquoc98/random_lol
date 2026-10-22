"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CHAMPIONS,
  Champion,
  ROLES,
  RoleId,
  getChampionSquareUrl,
} from "@/data/champions";
import { ChampionSlotCard } from "./ChampionSlotCard";
import { SkinClubLaneRow } from "./SkinClubLaneRow";
import { RoleIcon } from "./RoleIcon";
import {
  Dices,
  RotateCcw,
  Copy,
  Check,
  Shield,
  Swords,
  History,
  Sparkles,
  Unlock,
  CheckSquare,
  Volume2,
  VolumeX,
  Zap,
  Rows3,
  LayoutGrid,
  Flame,
} from "lucide-react";

type LineupState = Record<RoleId, Champion | null>;
type PoolMode = "ROLE_SPECIFIC" | "ALL_CHAMPIONS";
type ViewMode = "SKINCLUB_ROWS" | "CLASSIC_CARDS";

interface RollHistoryItem {
  id: string;
  timestamp: string;
  actionLabel: string;
  lineup: LineupState;
}

const INITIAL_ROLES: RoleId[] = ["TOP", "JG", "MID", "AD", "SP"];

function getCandidatePool(role: RoleId, mode: PoolMode): Champion[] {
  if (mode === "ALL_CHAMPIONS") {
    return CHAMPIONS;
  }
  return CHAMPIONS.filter((c) => c.roles.includes(role));
}

/**
 * Deterministic initial lineup so SSR and Client hydration match 100%
 */
const INITIAL_DETERMINISTIC_LINEUP: LineupState = {
  TOP: getCandidatePool("TOP", "ROLE_SPECIFIC")[0] || CHAMPIONS[0],
  JG: getCandidatePool("JG", "ROLE_SPECIFIC")[0] || CHAMPIONS[1],
  MID: getCandidatePool("MID", "ROLE_SPECIFIC")[0] || CHAMPIONS[2],
  AD: getCandidatePool("AD", "ROLE_SPECIFIC")[0] || CHAMPIONS[3],
  SP: getCandidatePool("SP", "ROLE_SPECIFIC")[0] || CHAMPIONS[4],
};

function pickRandomChampion(
  role: RoleId,
  mode: PoolMode,
  excludedIds: Set<string>,
  currentChampId?: string
): Champion {
  const pool = getCandidatePool(role, mode);
  let available = pool.filter(
    (c) => !excludedIds.has(c.id) && c.id !== currentChampId
  );

  if (available.length === 0) {
    available = pool.filter((c) => !excludedIds.has(c.id));
  }
  if (available.length === 0) {
    available = pool;
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function LolRandomizerApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("SKINCLUB_ROWS");
  const [poolMode, setPoolMode] = useState<PoolMode>("ROLE_SPECIFIC");
  const [fastSpin, setFastSpin] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [lineup, setLineup] = useState<LineupState>(
    INITIAL_DETERMINISTIC_LINEUP
  );
  const [rollingRoles, setRollingRoles] = useState<Record<RoleId, boolean>>({
    TOP: false,
    JG: false,
    MID: false,
    AD: false,
    SP: false,
  });
  const [spinTriggers, setSpinTriggers] = useState<Record<RoleId, number>>({
    TOP: 0,
    JG: 0,
    MID: 0,
    AD: 0,
    SP: 0,
  });
  const [lockedRoles, setLockedRoles] = useState<Record<RoleId, boolean>>({
    TOP: false,
    JG: false,
    MID: false,
    AD: false,
    SP: false,
  });
  const [selectedRoles, setSelectedRoles] = useState<Record<RoleId, boolean>>({
    TOP: false,
    JG: false,
    MID: false,
    AD: false,
    SP: false,
  });
  const [history, setHistory] = useState<RollHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [totalRolls, setTotalRolls] = useState(1);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  const playCaseTickSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    const nowMs = performance.now();
    if (nowMs - lastTickTimeRef.current < 42) return;
    lastTickTimeRef.current = nowMs;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.028);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignore Web Audio restriction before user gesture
    }
  }, [soundEnabled]);

  const playUnboxFinishSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") return;

      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const startT = ctx.currentTime + idx * 0.045;
        osc.frequency.setValueAtTime(f, startT);

        gain.gain.setValueAtTime(0.055, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.3);
      });
    } catch {
      // Ignore
    }
  }, [soundEnabled]);

  const performRoll = useCallback(
    (
      rolesToRoll: RoleId[],
      actionLabel: string,
      currentLineup: LineupState,
      mode: PoolMode,
      options?: { isFast?: boolean }
    ) => {
      if (rolesToRoll.length === 0) return;

      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];

      const usedIds = new Set<string>();
      const finalLineup: LineupState = { ...currentLineup };

      for (const r of INITIAL_ROLES) {
        if (!rolesToRoll.includes(r) && currentLineup[r]) {
          usedIds.add(currentLineup[r]!.id);
        }
      }

      for (const r of rolesToRoll) {
        const picked = pickRandomChampion(
          r,
          mode,
          usedIds,
          currentLineup[r]?.id
        );
        finalLineup[r] = picked;
        usedIds.add(picked.id);
      }

      setLineup(finalLineup);

      // Trigger horizontal case-opening spin for the selected lanes
      setRollingRoles((prev) => {
        const next = { ...prev };
        for (const r of rolesToRoll) {
          next[r] = true;
        }
        return next;
      });

      setSpinTriggers((prev) => {
        const next = { ...prev };
        for (const r of rolesToRoll) {
          next[r] = (next[r] || 0) + 1;
        }
        return next;
      });

      const baseDuration = options?.isFast ? 1150 : 2500;
      let maxDuration = baseDuration;

      rolesToRoll.forEach((roleId, idx) => {
        const laneDuration = baseDuration + idx * (options?.isFast ? 90 : 180);
        if (laneDuration > maxDuration) maxDuration = laneDuration;

        const t = setTimeout(() => {
          setRollingRoles((prev) => ({ ...prev, [roleId]: false }));
        }, laneDuration);
        timersRef.current.push(t);
      });

      const finishTimer = setTimeout(() => {
        playUnboxFinishSound();
        setTotalRolls((c) => c + 1);

        const now = new Date();
        const timeStr = now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setHistory((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: timeStr,
            actionLabel,
            lineup: finalLineup,
          },
          ...prev.slice(0, 9),
        ]);
      }, maxDuration);

      timersRef.current.push(finishTimer);
    },
    [playUnboxFinishSound]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleRollAll = () => {
    const unlockedRoles = INITIAL_ROLES.filter((r) => !lockedRoles[r]);
    if (unlockedRoles.length === 0) {
      performRoll(INITIAL_ROLES, "Mở Hòm Cả 5 Đường", lineup, poolMode, {
        isFast: fastSpin,
      });
      return;
    }
    const label =
      unlockedRoles.length === 5
        ? "Mở Hòm Cả 5 Đường"
        : `Mở Hòm ${unlockedRoles.length} Đường (${unlockedRoles.join(", ")})`;
    performRoll(unlockedRoles, label, lineup, poolMode, { isFast: fastSpin });
  };

  const handleRerollSingleLane = (role: RoleId) => {
    performRoll([role], `Mở lại hòm ${role}`, lineup, poolMode, {
      isFast: fastSpin,
    });
  };

  const handleRerollSelectedLanes = () => {
    const chosen = INITIAL_ROLES.filter((r) => selectedRoles[r]);
    if (chosen.length === 0) return;
    performRoll(
      chosen,
      `Mở lại hòm đã chọn (${chosen.join(", ")})`,
      lineup,
      poolMode,
      { isFast: fastSpin }
    );
  };

  const toggleLockRole = (role: RoleId) => {
    setLockedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const toggleSelectRole = (role: RoleId) => {
    setSelectedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const handleCopyTeam = async () => {
    const lines = ROLES.map(
      (r) => `${r.shortName} (${r.name}): ${lineup[r.id]?.name ?? "Chưa có"}`
    );
    const text = `🎰 ĐỘI HÌNH LMHT MỞ HÒM 5 ĐƯỜNG:\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const selectedCount = INITIAL_ROLES.filter((r) => selectedRoles[r]).length;
  const lockedCount = INITIAL_ROLES.filter((r) => lockedRoles[r]).length;
  const isAnyRolling = INITIAL_ROLES.some((r) => rollingRoles[r]);

  const activeChamps = INITIAL_ROLES.map((r) => lineup[r]).filter(
    Boolean
  ) as Champion[];
  const adCount = activeChamps.filter((c) => c.damageType === "AD").length;
  const apCount = activeChamps.filter((c) => c.damageType === "AP").length;
  const tankCount = activeChamps.filter((c) => c.damageType === "TANK").length;
  const mixedCount = activeChamps.filter((c) => c.damageType === "MIXED").length;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#080b13] text-slate-100 flex flex-col justify-between px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <div className="w-full max-w-[1440px] mx-auto">
        {/* SKIN.CLUB SIGNATURE LIVE DROPS TICKER BAR */}
        <div className="mb-4 rounded-2xl bg-[#0e1322] border border-[#1e2742] p-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>LIVE DROPS • ĐỘI HÌNH HIỆN TẠI</span>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 flex-1 max-w-3xl">
            {ROLES.map((r) => {
              const ch = lineup[r.id];
              const isRollingLane = rollingRoles[r.id];
              const bottomBar =
                ch?.damageType === "AD"
                  ? "bg-[#eb4b4b]"
                  : ch?.damageType === "AP"
                  ? "bg-[#d32ce6]"
                  : ch?.damageType === "MIXED"
                  ? "bg-[#8847ff]"
                  : "bg-[#4b69ff]";

              return (
                <div
                  key={r.id}
                  onClick={() => handleRerollSingleLane(r.id)}
                  title={`Bấm để quay lại hòm ${r.shortName}`}
                  className="group relative rounded-xl overflow-hidden bg-[#141b2e] hover:bg-[#1b243d] border border-[#253052] px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {ch && (
                    <img
                      src={getChampionSquareUrl(ch.id)}
                      alt={ch.name}
                      width={32}
                      height={32}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-amber-400/50 shrink-0 ${
                        isRollingLane ? "animate-pulse blur-[1px]" : ""
                      }`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[9px] font-black uppercase tracking-wider truncate"
                      style={{ color: r.accentColor }}
                    >
                      {r.shortName}
                    </div>
                    <div className="text-[11px] sm:text-xs font-extrabold text-white truncate">
                      {isRollingLane ? "Đang mở..." : ch?.name ?? "-"}
                    </div>
                  </div>
                  <div
                    className={`absolute bottom-0 inset-x-0 h-[3px] ${bottomBar}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Header Section */}
        <header className="mb-4 sm:mb-5 fluid-header-container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1d253d]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151c30] border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>SKIN.CLUB CASE BATTLE • 5-LANE ROULETTE</span>
              </div>
              <h1 className="fluid-hero-title font-black tracking-tight text-white uppercase">
                Mở Hòm Tướng 5 Đường{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400">
                  SKIN.CLUB EDITION
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Trải nghiệm mở hòm 5 hàng ngang chuẩn <strong className="text-amber-300">Skin.Club / CS2</strong> với vạch độ hiếm{" "}
                <span className="text-[#eb4b4b] font-bold">Covert</span>,{" "}
                <span className="text-[#d32ce6] font-bold">Classified</span>,{" "}
                <span className="text-[#8847ff] font-bold">Restricted</span> và{" "}
                <span className="text-amber-300 font-bold">Gold Special</span>.
              </p>
            </div>

            {/* Mode Selector, Layout Toggle & Copy Button */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* View Mode Toggle: 5 Horizontal Rows (Skin.Club) vs 5 Vertical Cards */}
              <div className="inline-flex rounded-xl p-1 bg-[#111728] border border-[#232d4b]">
                <button
                  type="button"
                  onClick={() => setViewMode("SKINCLUB_ROWS")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "SKINCLUB_ROWS"
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Rows3 className="w-3.5 h-3.5 shrink-0" />
                  <span>5 Hàng Ngang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("CLASSIC_CARDS")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === "CLASSIC_CARDS"
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  <span>Thẻ Dọc</span>
                </button>
              </div>

              {/* Pool Mode Selector */}
              <div className="inline-flex rounded-xl p-1 bg-[#111728] border border-[#232d4b]">
                <button
                  type="button"
                  onClick={() => setPoolMode("ROLE_SPECIFIC")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    poolMode === "ROLE_SPECIFIC"
                      ? "bg-[#222c49] text-amber-300 border border-amber-400/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Đúng Đường</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPoolMode("ALL_CHAMPIONS")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    poolMode === "ALL_CHAMPIONS"
                      ? "bg-[#222c49] text-cyan-300 border border-cyan-400/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Swords className="w-3.5 h-3.5 shrink-0" />
                  <span>Mọi Tướng</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyTeam}
                className="hextech-action-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#141b2e] text-slate-200 border border-[#283456] hover:border-amber-400 hover:text-amber-300 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Đã Copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copy Đội Hình</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Control Deck: Main Case Open Buttons + Speed/Sound + Quick Single-Lane Triggers */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-[#101524] border border-[#1f2844] shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
            {/* Primary Case Spin Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleRollAll}
                disabled={isAnyRolling}
                className="hextech-action-btn inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-xs sm:text-base uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] cursor-pointer disabled:opacity-60"
              >
                <Dices
                  className={`w-5 h-5 ${isAnyRolling ? "animate-spin" : ""}`}
                />
                <span>
                  {isAnyRolling
                    ? "Đang Mở Hòm..."
                    : lockedCount > 0 && lockedCount < 5
                    ? `Mở Hòm ${5 - lockedCount} Đường Chưa Khóa`
                    : "🎰 Mở Hòm Cả 5 Đường"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRerollSelectedLanes}
                disabled={selectedCount === 0 || isAnyRolling}
                className={`hextech-action-btn inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider border transition-all cursor-pointer ${
                  selectedCount > 0
                    ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                    : "bg-[#171e33] text-slate-500 border-[#232d4b] cursor-not-allowed"
                }`}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Mở Hòm Đã Chọn ({selectedCount}/5)</span>
              </button>

              {/* Fast Spin & Sound Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFastSpin((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                    fastSpin
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      : "bg-[#171e33] text-slate-300 border-[#253050] hover:text-white"
                  }`}
                  title="Bật/Tắt chế độ mở hòm nhanh (1.2 giây)"
                >
                  <Zap
                    className={`w-3.5 h-3.5 ${
                      fastSpin
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-400"
                    }`}
                  />
                  <span>{fastSpin ? "Mở Nhanh: BẬT" : "Mở Nhanh"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer ${
                    soundEnabled
                      ? "bg-cyan-400/15 text-cyan-300 border-cyan-400/50"
                      : "bg-[#171e33] text-slate-400 border-[#253050]"
                  }`}
                  title="Bật/Tắt âm thanh tạch tạch khi mở hòm"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="hidden sm:inline">
                    {soundEnabled ? "Âm Thanh" : "Tắt Tiếng"}
                  </span>
                </button>
              </div>

              {(selectedCount > 0 || lockedCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoles({
                      TOP: false,
                      JG: false,
                      MID: false,
                      AD: false,
                      SP: false,
                    });
                    setLockedRoles({
                      TOP: false,
                      JG: false,
                      MID: false,
                      AD: false,
                      SP: false,
                    });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#1a223a] border border-[#2a3659] cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Bỏ Chọn/Khóa</span>
                </button>
              )}
            </div>

            {/* Quick Single-Lane Spin Pills */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-[#1f2844]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                Mở lẻ 1 hòm:
              </span>
              <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRerollSingleLane(role.id)}
                    disabled={rollingRoles[role.id]}
                    className="hextech-action-btn inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#161e33] hover:bg-[#1f2a47] text-slate-200 hover:text-amber-300 border border-[#263254] hover:border-amber-400/60 cursor-pointer disabled:opacity-50"
                  >
                    <span style={{ color: role.accentColor }}>
                      <RoleIcon role={role.id} className="w-3.5 h-3.5" />
                    </span>
                    <span>{role.shortName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content: 5-Row Skin.Club Case Opening OR 5-Column Cards */}
        <main className="flex-1">
          {viewMode === "SKINCLUB_ROWS" ? (
            <section
              aria-label="5 Hàng Ngang Mở Hòm Tướng Kiểu Skin.Club"
              className="space-y-3.5"
            >
              {ROLES.map((role, index) => {
                const candidatePool = getCandidatePool(role.id, poolMode);
                const spinDurationMs =
                  (fastSpin ? 1150 : 2500) + index * (fastSpin ? 90 : 180);

                return (
                  <SkinClubLaneRow
                    key={role.id}
                    role={role}
                    champion={lineup[role.id]}
                    candidatePool={candidatePool}
                    spinTriggerId={spinTriggers[role.id]}
                    spinDurationMs={spinDurationMs}
                    isRolling={rollingRoles[role.id]}
                    isLocked={lockedRoles[role.id]}
                    isSelectedForReroll={selectedRoles[role.id]}
                    onRerollLane={() => handleRerollSingleLane(role.id)}
                    onToggleLock={() => toggleLockRole(role.id)}
                    onToggleSelect={() => toggleSelectRole(role.id)}
                    onTickSound={playCaseTickSound}
                  />
                );
              })}
            </section>
          ) : (
            <section
              aria-label="Đội hình 5 đường Liên Minh Huyền Thoại"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
            >
              {ROLES.map((role, index) => {
                const poolCount = getCandidatePool(role.id, poolMode).length;
                return (
                  <ChampionSlotCard
                    key={role.id}
                    role={role}
                    champion={lineup[role.id]}
                    isRolling={rollingRoles[role.id]}
                    isLocked={lockedRoles[role.id]}
                    isSelectedForReroll={selectedRoles[role.id]}
                    poolCount={poolCount}
                    isPriorityImage={index === 0}
                    onRerollLane={() => handleRerollSingleLane(role.id)}
                    onToggleLock={() => toggleLockRole(role.id)}
                    onToggleSelect={() => toggleSelectRole(role.id)}
                  />
                );
              })}
            </section>
          )}

          {/* Team Composition Summary & Roll History (Skin.Club Dark Theme) */}
          <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Team Composition Analysis */}
            <section className="p-4 rounded-2xl bg-[#101524] border border-[#1f2844] shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <Swords className="w-4 h-4 text-amber-400" />
                    <span>Tỷ Lệ Độ Hiếm &amp; Sát Thương Đội Hình</span>
                  </h2>
                  <span className="text-xs text-slate-400">
                    Số hòm đã mở:{" "}
                    <strong className="text-amber-300">{totalRolls}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
                  <div className="p-2.5 rounded-xl bg-[#24131a] border border-[#eb4b4b]/40 flex items-center justify-between">
                    <span className="text-rose-300 font-bold">
                      Covert AD (Vật Lý)
                    </span>
                    <span className="text-base font-black text-white">
                      {adCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#22132a] border border-[#d32ce6]/40 flex items-center justify-between">
                    <span className="text-fuchsia-300 font-bold">
                      Classified AP (Phép)
                    </span>
                    <span className="text-base font-black text-white">
                      {apCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121c30] border border-[#4b69ff]/40 flex items-center justify-between">
                    <span className="text-sky-300 font-bold">
                      Mil-Spec Tank (Đỡ Đòn)
                    </span>
                    <span className="text-base font-black text-white">
                      {tankCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#1b1430] border border-[#8847ff]/40 flex items-center justify-between">
                    <span className="text-purple-300 font-bold">
                      Restricted (Hỗn Hợp)
                    </span>
                    <span className="text-base font-black text-white">
                      {mixedCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0b0e18] border border-[#1d253e] text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hướng dẫn Case Battle 5 Đường:</span>
                </div>
                <p>
                  Bấm <strong>&ldquo;Mở [TOP/JG/MID/AD/SP]&rdquo;</strong> ở đầu
                  mỗi hàng để quay lẻ 1 hòm, hoặc bấm biểu tượng{" "}
                  <strong>Ổ Khóa</strong> để giữ lại tướng Gold Special đã trúng!
                </p>
              </div>
            </section>

            {/* Roll History List */}
            <section className="lg:col-span-2 p-4 rounded-2xl bg-[#101524] border border-[#1f2844] shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Lịch Sử Mở Hòm Gần Đây (Bấm để khôi phục đội hình)</span>
                </h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-xs text-slate-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Xóa lịch sử
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Hãy bấm <strong>&ldquo;🎰 Mở Hòm Cả 5 Đường&rdquo;</strong> để
                  bắt đầu quay hòm và lưu lịch sử!
                </p>
              ) : (
                <div className="scrollable-panel space-y-2 max-h-[210px] pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLineup(item.lineup)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#151c30] hover:bg-[#1c2540] border border-[#253152] hover:border-amber-400/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.timestamp}
                        </span>
                        <span className="text-xs font-bold text-amber-300 truncate">
                          {item.actionLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ROLES.map((r) => {
                          const ch = item.lineup[r.id];
                          return (
                            <div
                              key={r.id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0c101c] border border-[#242f4d] text-xs"
                            >
                              <span
                                className="font-black text-[10px]"
                                style={{ color: r.accentColor }}
                              >
                                {r.shortName}:
                              </span>
                              {ch && (
                                <img
                                  src={getChampionSquareUrl(ch.id)}
                                  alt={ch.name}
                                  width={18}
                                  height={18}
                                  loading="lazy"
                                  className="w-4 h-4 rounded-xs object-cover"
                                />
                              )}
                              <span className="text-slate-100 font-semibold">
                                {ch?.name ?? "-"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
