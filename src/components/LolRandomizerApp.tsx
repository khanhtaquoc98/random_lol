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
} from "lucide-react";

type LineupState = Record<RoleId, Champion | null>;
type PoolMode = "ROLE_SPECIFIC" | "ALL_CHAMPIONS";

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
  const [poolMode, setPoolMode] = useState<PoolMode>("ROLE_SPECIFIC");
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performRoll = useCallback(
    (
      rolesToRoll: RoleId[],
      actionLabel: string,
      currentLineup: LineupState,
      mode: PoolMode
    ) => {
      if (rolesToRoll.length === 0) return;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setRollingRoles((prev) => {
        const next = { ...prev };
        for (const r of rolesToRoll) {
          next[r] = true;
        }
        return next;
      });

      const performSelection = (): LineupState => {
        const usedIds = new Set<string>();
        const nextLineup: LineupState = { ...currentLineup };

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
          nextLineup[r] = picked;
          usedIds.add(picked.id);
        }

        return nextLineup;
      };

      const previewLineup = performSelection();
      setLineup(previewLineup);

      timerRef.current = setTimeout(() => {
        const finalLineup = performSelection();
        setLineup(finalLineup);
        setRollingRoles({
          TOP: false,
          JG: false,
          MID: false,
          AD: false,
          SP: false,
        });
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
      }, 260);
    },
    []
  );

  useEffect(() => {
    performRoll(
      INITIAL_ROLES,
      "Roll 5 Đường Khởi Tạo",
      { TOP: null, JG: null, MID: null, AD: null, SP: null },
      "ROLE_SPECIFIC"
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [performRoll]);

  const handleRollAll = () => {
    const unlockedRoles = INITIAL_ROLES.filter((r) => !lockedRoles[r]);
    if (unlockedRoles.length === 0) {
      performRoll(INITIAL_ROLES, "Roll Tất Cả 5 Đường", lineup, poolMode);
      return;
    }
    const label =
      unlockedRoles.length === 5
        ? "Roll Tất Cả 5 Đường"
        : `Roll ${unlockedRoles.length} Đường (${unlockedRoles.join(", ")})`;
    performRoll(unlockedRoles, label, lineup, poolMode);
  };

  const handleRerollSingleLane = (role: RoleId) => {
    performRoll([role], `Roll lại đường ${role}`, lineup, poolMode);
  };

  const handleRerollSelectedLanes = () => {
    const chosen = INITIAL_ROLES.filter((r) => selectedRoles[r]);
    if (chosen.length === 0) return;
    performRoll(
      chosen,
      `Roll lại đường đã chọn (${chosen.join(", ")})`,
      lineup,
      poolMode
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
    const text = `🎮 ĐỘI HÌNH LMHT NGẪU NHIÊN:\n${lines.join("\n")}`;
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
      <header className="mb-5 sm:mb-6 fluid-header-container">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-800 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>League of Legends • Hextech Randomizer</span>
            </div>
            <h1 className="fluid-hero-title font-black tracking-tight text-slate-900 uppercase">
              Random Tướng 5 Đường{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-teal-600 to-sky-600">
                TOP / JG / MID / AD / SP
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Mỗi lần quay ngẫu nhiên đủ 5 vị trí không trùng lặp. Bạn có thể bấm{" "}
              <strong className="text-teal-700">Roll lại từng đường riêng biệt</strong>{" "}
              ngay trên thẻ đường đó hoặc tích chọn nhiều đường để roll lại cùng lúc.
            </p>
          </div>

          {/* Mode Selector & Quick Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPoolMode("ROLE_SPECIFIC")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ROLE_SPECIFIC"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Đúng Đường (Meta)</span>
              </button>
              <button
                type="button"
                onClick={() => setPoolMode("ALL_CHAMPIONS")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ALL_CHAMPIONS"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Swords className="w-3.5 h-3.5 shrink-0" />
                <span>Mọi Tướng (All Pool)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyTeam}
              className="hextech-action-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-300 hover:border-teal-500 hover:text-teal-700 shadow-2xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Đã Sao Chép!</span>
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

        {/* Control Bar: Main Roll All + Roll Selected + Quick Single-Lane Reroll Bar */}
        <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 sm:gap-4">
          {/* Primary Roll Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleRollAll}
              disabled={isAnyRolling}
              className="hextech-action-btn inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg font-black text-xs sm:text-base uppercase tracking-wider text-white bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 shadow-md cursor-pointer disabled:opacity-60"
            >
              <Dices
                className={`w-5 h-5 ${isAnyRolling ? "animate-spin" : ""}`}
              />
              <span>
                {lockedCount > 0 && lockedCount < 5
                  ? `Roll ${5 - lockedCount} Đường Chưa Khóa`
                  : "Roll Tất Cả 5 Đường"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRerollSelectedLanes}
              disabled={selectedCount === 0 || isAnyRolling}
              className={`hextech-action-btn inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg font-extrabold text-xs sm:text-sm uppercase tracking-wider border transition-all cursor-pointer ${
                selectedCount > 0
                  ? "bg-teal-600 text-white border-teal-600 shadow-md"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Roll Lại Đường Đã Chọn ({selectedCount}/5)</span>
            </button>

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
                <span>Đặt lại Chọn/Khóa</span>
              </button>
            )}
          </div>

          {/* Quick Single-Lane Reroll Pills */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1">
              Roll nhanh 1 đường:
            </span>
            <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRerollSingleLane(role.id)}
                  disabled={rollingRoles[role.id]}
                  className="hextech-action-btn inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-700 border border-slate-200 hover:border-teal-400 cursor-pointer"
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

      {/* Main 5-Lane Grid */}
      <main className="flex-1">
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

        {/* Team Composition Summary & Roll History */}
        <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Team Composition Analysis */}
          <section className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-teal-600" />
                  <span>Phân Tích Đội Hình Hiện Tại</span>
                </h2>
                <span className="text-xs text-slate-500">
                  Lượt roll:{" "}
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
                <span>Mẹo sử dụng nhanh:</span>
              </div>
              <p>
                Bấm nút <strong>&ldquo;Roll lại [Đường]&rdquo;</strong> ở dưới mỗi thẻ để
                đổi riêng 1 đường, hoặc bấm <strong>&ldquo;Chọn&rdquo;</strong> trên nhiều
                đường rồi nhấn <strong>&ldquo;Roll Lại Đường Đã Chọn&rdquo;</strong>.
              </p>
            </div>
          </section>

          {/* Roll History List */}
          <section className="lg:col-span-2 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>Lịch Sử Roll Gần Đây (Bấm để khôi phục)</span>
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
                Chưa có lịch sử roll nào.
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
