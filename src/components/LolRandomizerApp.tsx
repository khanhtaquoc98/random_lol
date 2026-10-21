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
  // Prefer champions not in excludedIds and different from the current champion in this slot
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

      // Mark target lanes as rolling
      setRollingRoles((prev) => {
        const next = { ...prev };
        for (const r of rolesToRoll) {
          next[r] = true;
        }
        return next;
      });

      // Keep track of already occupied champions in lanes that are NOT rolling
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

      // Quick slot-machine shuffle preview
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

  // Initial roll on first client mount
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
      // If all are locked, still roll all or alert? Let's unlock and roll all if none unlocked
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

  // Calculate team composition stats
  const activeChamps = INITIAL_ROLES.map((r) => lineup[r]).filter(
    Boolean
  ) as Champion[];
  const adCount = activeChamps.filter((c) => c.damageType === "AD").length;
  const apCount = activeChamps.filter((c) => c.damageType === "AP").length;
  const tankCount = activeChamps.filter((c) => c.damageType === "TANK").length;
  const mixedCount = activeChamps.filter((c) => c.damageType === "MIXED").length;

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-6 sm:px-6 lg:px-10 max-w-[1440px] mx-auto">
      {/* Header Section */}
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#C8AA6E]/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8AA6E]/15 border border-[#C8AA6E]/40 text-[#C8AA6E] text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0AC8B9]" />
              <span>League of Legends • Hextech Randomizer</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#F0E6D2] uppercase">
              Random Tướng 5 Đường{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8AA6E] via-[#F0E6D2] to-[#0AC8B9]">
                TOP / JG / MID / AD / SP
              </span>
            </h1>
            <p className="text-sm text-[#C8AA6E]/85 mt-1 max-w-2xl">
              Mỗi lần quay ngẫu nhiên đủ 5 vị trí không trùng lặp. Bạn có thể bấm{" "}
              <strong className="text-[#0AC8B9]">Roll lại từng đường riêng biệt</strong>{" "}
              ngay trên thẻ đường đó hoặc tích chọn nhiều đường để roll lại cùng lúc.
            </p>
          </div>

          {/* Mode Selector & Quick Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg p-1 bg-[#091428] border border-[#C8AA6E]/40">
              <button
                type="button"
                onClick={() => setPoolMode("ROLE_SPECIFIC")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ROLE_SPECIFIC"
                    ? "bg-gradient-to-r from-[#C8AA6E] to-[#9E7E43] text-[#010A13] shadow"
                    : "text-[#C8AA6E] hover:text-[#F0E6D2]"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Đúng Đường (Meta)</span>
              </button>
              <button
                type="button"
                onClick={() => setPoolMode("ALL_CHAMPIONS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  poolMode === "ALL_CHAMPIONS"
                    ? "bg-gradient-to-r from-[#0AC8B9] to-[#005A82] text-[#010A13] shadow"
                    : "text-[#C8AA6E] hover:text-[#F0E6D2]"
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Mọi Tướng (All Pool)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyTeam}
              className="hextech-action-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#091428] text-[#F0E6D2] border border-[#C8AA6E]/50 hover:border-[#0AC8B9] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Đã Sao Chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C8AA6E]" />
                  <span>Copy Đội Hình</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Control Bar: Main Roll All + Roll Selected + Quick Single-Lane Reroll Bar */}
        <div className="mt-5 p-4 rounded-xl bg-[#091428]/90 border border-[#C8AA6E]/35 shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Primary Roll Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRollAll}
              disabled={isAnyRolling}
              className="hextech-action-btn flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg font-black text-sm sm:text-base uppercase tracking-wider text-[#010A13] bg-gradient-to-r from-[#C8AA6E] via-[#F0E6D2] to-[#C8AA6E] hover:from-[#F0E6D2] hover:to-[#C8AA6E] shadow-[0_0_25px_rgba(200,170,110,0.4)] border border-[#F0E6D2] cursor-pointer disabled:opacity-60"
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
              className={`hextech-action-btn inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg font-extrabold text-xs sm:text-sm uppercase tracking-wider border transition-all cursor-pointer ${
                selectedCount > 0
                  ? "bg-gradient-to-r from-[#0AC8B9] to-[#05968A] text-[#010A13] border-[#A5F3FC] shadow-[0_0_20px_rgba(10,200,185,0.4)]"
                  : "bg-[#010A13]/60 text-[#C8AA6E]/45 border-[#C8AA6E]/20 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#C8AA6E] hover:text-[#F0E6D2] bg-[#010A13]/60 border border-[#C8AA6E]/30 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Đặt lại Chọn/Khóa</span>
              </button>
            )}
          </div>

          {/* Quick Single-Lane Reroll Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-[#C8AA6E]/20">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C8AA6E] mr-1">
              Roll nhanh 1 đường:
            </span>
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRerollSingleLane(role.id)}
                disabled={rollingRoles[role.id]}
                className="hextech-action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#010A13] hover:bg-[#0AC8B9]/15 text-[#F0E6D2] border border-[#C8AA6E]/40 hover:border-[#0AC8B9] cursor-pointer"
              >
                <span style={{ color: role.accentColor }}>
                  <RoleIcon role={role.id} className="w-3.5 h-3.5" />
                </span>
                <span>{role.shortName}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main 5-Lane Grid */}
      <main className="flex-1">
        <section
          aria-label="Đội hình 5 đường Liên Minh Huyền Thoại"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
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
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Team Composition Analysis */}
          <section className="p-4 rounded-xl bg-[#091428]/85 border border-[#C8AA6E]/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#C8AA6E] flex items-center gap-2">
                  <Swords className="w-4 h-4 text-[#0AC8B9]" />
                  <span>Phân Tích Đội Hình Hiện Tại</span>
                </h2>
                <span className="text-xs text-[#C8AA6E]/75">
                  Lượt roll: <strong className="text-[#F0E6D2]">{totalRolls}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
                <div className="p-2.5 rounded-lg bg-[#010A13]/70 border border-orange-500/30 flex items-center justify-between">
                  <span className="text-orange-300 font-semibold">Vật Lý (AD)</span>
                  <span className="text-base font-black text-[#F0E6D2]">{adCount}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#010A13]/70 border border-sky-500/30 flex items-center justify-between">
                  <span className="text-sky-300 font-semibold">Phép Thuật (AP)</span>
                  <span className="text-base font-black text-[#F0E6D2]">{apCount}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#010A13]/70 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold">Đỡ Đòn (Tank)</span>
                  <span className="text-base font-black text-[#F0E6D2]">{tankCount}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#010A13]/70 border border-purple-500/30 flex items-center justify-between">
                  <span className="text-purple-300 font-semibold">Hỗn Hợp</span>
                  <span className="text-base font-black text-[#F0E6D2]">{mixedCount}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#010A13]/60 border border-[#C8AA6E]/20 text-xs text-[#C8AA6E]/90">
              <div className="flex items-center gap-1.5 font-bold text-[#F0E6D2] mb-1">
                <CheckSquare className="w-3.5 h-3.5 text-[#0AC8B9]" />
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
          <section className="lg:col-span-2 p-4 rounded-xl bg-[#091428]/85 border border-[#C8AA6E]/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#C8AA6E] flex items-center gap-2">
                <History className="w-4 h-4 text-[#0AC8B9]" />
                <span>Lịch Sử Roll Gần Đây (Bấm để khôi phục)</span>
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-[#C8AA6E]/70 hover:text-[#F0E6D2] underline cursor-pointer"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-[#C8AA6E]/60 py-6 text-center">
                Chưa có lịch sử roll nào.
              </p>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLineup(item.lineup)}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2 rounded-lg bg-[#010A13]/75 hover:bg-[#0AC8B9]/10 border border-[#C8AA6E]/20 hover:border-[#0AC8B9]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-[11px] font-mono text-[#C8AA6E]/75">
                        {item.timestamp}
                      </span>
                      <span className="text-xs font-bold text-[#0AC8B9] truncate">
                        {item.actionLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {ROLES.map((r) => {
                        const ch = item.lineup[r.id];
                        return (
                          <div
                            key={r.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#091428] border border-[#C8AA6E]/25 text-xs"
                          >
                            <span
                              className="font-extrabold text-[10px]"
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
                            <span className="text-[#F0E6D2] font-medium">
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
