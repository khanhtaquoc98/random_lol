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

  const [lineup, setLineup] = useState<LineupState>({
    TOP: null,
    JG: null,
    MID: null,
    AD: null,
    SP: null,
  });
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
  const [totalRolls, setTotalRolls] = useState(0);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  const playCaseTickSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    const nowMs = performance.now();
    // Throttle ticks when multiple rows spin simultaneously so audio stays crisp
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
      options?: { isInitialMount?: boolean; isFast?: boolean }
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

      if (options?.isInitialMount) {
        setTotalRolls(1);
        const now = new Date();
        const timeStr = now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setHistory([
          {
            id: `${Date.now()}-init`,
            timestamp: timeStr,
            actionLabel,
            lineup: finalLineup,
          },
        ]);
        return;
      }

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
    performRoll(
      INITIAL_ROLES,
      "Khởi Tạo Đội Hình 5 Đường",
      { TOP: null, JG: null, MID: null, AD: null, SP: null },
      "ROLE_SPECIFIC",
      { isInitialMount: true }
    );
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [performRoll]);

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
    performRoll([role], `Quay lại đường ${role}`, lineup, poolMode, {
      isFast: fastSpin,
    });
  };

  const handleRerollSelectedLanes = () => {
    const chosen = INITIAL_ROLES.filter((r) => selectedRoles[r]);
    if (chosen.length === 0) return;
    performRoll(
      chosen,
      `Quay lại đường đã chọn (${chosen.join(", ")})`,
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
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col justify-between px-3 py-4 sm:px-6 sm:py-6 lg:px-10 max-w-[1440px] mx-auto">
      {/* Header Section */}
      <header className="mb-4 sm:mb-5 fluid-header-container">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-800 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Skin.Club Style • 5-Lane Case Opening</span>
            </div>
            <h1 className="fluid-hero-title font-black tracking-tight text-slate-900 uppercase">
              Mở Hòm Tướng 5 Đường{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-teal-600 to-sky-600">
                TOP / JG / MID / AD / SP
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Trải dài 5 đường thành <strong>5 hàng ngang quay hòm kiểu Skin.Club</strong>{" "}
              với kim chỉ laser trung tâm. Bạn có thể bấm{" "}
              <strong className="text-teal-700">Mở Hòm Cả 5 Đường</strong> hoặc{" "}
              <strong className="text-amber-700">Quay lẻ từng hàng ngang</strong>!
            </p>
          </div>

          {/* Mode Selector, Layout Toggle & Copy Button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* View Mode Toggle: 5 Horizontal Rows (Skin.Club) vs 5 Vertical Cards */}
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("SKINCLUB_ROWS")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "SKINCLUB_ROWS"
                    ? "bg-slate-900 text-amber-400 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Rows3 className="w-3.5 h-3.5 shrink-0" />
                <span>5 Hàng Ngang (Skin.Club)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CLASSIC_CARDS")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === "CLASSIC_CARDS"
                    ? "bg-slate-900 text-amber-400 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>Thẻ Dọc</span>
              </button>
            </div>

            {/* Pool Mode Selector */}
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setPoolMode("ROLE_SPECIFIC")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ROLE_SPECIFIC"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Đúng Đường</span>
              </button>
              <button
                type="button"
                onClick={() => setPoolMode("ALL_CHAMPIONS")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ALL_CHAMPIONS"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Swords className="w-3.5 h-3.5 shrink-0" />
                <span>Mọi Tướng</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyTeam}
              className="hextech-action-btn inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-300 hover:border-teal-500 hover:text-teal-700 shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Đã Copy!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-600" />
                  <span>Copy Đội Hình</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Control Bar: Main Case Open Buttons + Speed/Sound + Quick Single-Lane Triggers */}
        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
          {/* Primary Case Spin Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleRollAll}
              disabled={isAnyRolling}
              className="hextech-action-btn inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-base uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md cursor-pointer disabled:opacity-60"
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
              className={`hextech-action-btn inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider border transition-all cursor-pointer ${
                selectedCount > 0
                  ? "bg-teal-600 text-white border-teal-600 shadow-md"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Quay Đường Đã Chọn ({selectedCount}/5)</span>
            </button>

            {/* Fast Spin & Sound Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFastSpin((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  fastSpin
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
                title="Bật/Tắt chế độ quay nhanh (1.2 giây)"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    fastSpin ? "text-amber-500 fill-amber-500" : "text-slate-400"
                  }`}
                />
                <span>{fastSpin ? "Quay Nhanh: BẬT" : "Quay Nhanh"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  soundEnabled
                    ? "bg-teal-50 text-teal-800 border-teal-300"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
                title="Bật/Tắt âm thanh tạch tạch khi mở hòm"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
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
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Bỏ Chọn/Khóa</span>
              </button>
            )}
          </div>

          {/* Quick Single-Lane Spin Pills */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1">
              Mở lẻ 1 hàng:
            </span>
            <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRerollSingleLane(role.id)}
                  disabled={rollingRoles[role.id]}
                  className="hextech-action-btn inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-slate-200 hover:border-amber-400 cursor-pointer disabled:opacity-50"
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
            className="space-y-3"
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

        {/* Team Composition Summary & Roll History */}
        <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Team Composition Analysis */}
          <section className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-teal-600" />
                  <span>Phân Tích Đội Hình Trúng Hòm</span>
                </h2>
                <span className="text-xs text-slate-500">
                  Lượt mở:{" "}
                  <strong className="text-slate-900">{totalRolls}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
                <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <span className="text-orange-800 font-semibold">
                    Vật Lý (AD)
                  </span>
                  <span className="text-base font-black text-orange-950">
                    {adCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-between">
                  <span className="text-sky-800 font-semibold">
                    Phép Thuật (AP)
                  </span>
                  <span className="text-base font-black text-sky-950">
                    {apCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-emerald-800 font-semibold">
                    Đỡ Đòn (Tank)
                  </span>
                  <span className="text-base font-black text-emerald-950">
                    {tankCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
                  <span className="text-purple-800 font-semibold">Hỗn Hợp</span>
                  <span className="text-base font-black text-purple-950">
                    {mixedCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Mẹo mở hòm Skin.Club:</span>
              </div>
              <p>
                Mỗi hàng ngang là 1 hòm tướng theo đường. Bấm{" "}
                <strong>&ldquo;Quay [Đường]&rdquo;</strong> ở đầu mỗi hàng để quay lẻ 1
                đường, hoặc bấm <strong>&ldquo;Khóa&rdquo;</strong> để giữ lại tướng yêu
                thích khi quay các hàng còn lại!
              </p>
            </div>
          </section>

          {/* Roll History List */}
          <section className="lg:col-span-2 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>Lịch Sử Mở Hòm Gần Đây (Bấm để khôi phục)</span>
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Chưa có lịch sử mở hòm nào.
              </p>
            ) : (
              <div className="scrollable-panel space-y-2 max-h-[210px] pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLineup(item.lineup)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <span className="text-[11px] font-mono text-slate-500">
                        {item.timestamp}
                      </span>
                      <span className="text-xs font-bold text-teal-700 truncate">
                        {item.actionLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ROLES.map((r) => {
                        const ch = item.lineup[r.id];
                        return (
                          <div
                            key={r.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-xs shadow-2xs"
                          >
                            <span className="font-extrabold text-[10px] text-slate-700">
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
                            <span className="text-slate-900 font-medium">
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
  );
}
