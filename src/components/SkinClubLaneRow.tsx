"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Champion,
  RoleInfo,
  getChampionLoadingUrl,
  getChampionSquareUrl,
} from "@/data/champions";
import { RoleIcon } from "./RoleIcon";
import {
  Dices,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface SkinClubLaneRowProps {
  role: RoleInfo;
  champion: Champion | null;
  candidatePool: Champion[];
  spinTriggerId: number;
  spinDurationMs: number;
  isRolling: boolean;
  isLocked: boolean;
  isSelectedForReroll: boolean;
  onRerollLane: () => void;
  onToggleLock: () => void;
  onToggleSelect: () => void;
  onTickSound?: () => void;
}

const CARD_W = 128; // px width of each skin-case item card
const CARD_GAP = 10; // px gap between cards
const STEP = CARD_W + CARD_GAP; // 138px per card step
const TOTAL_REEL_CARDS = 38;
const START_INDEX = 4; // Card initially under center needle before spin
const WINNING_INDEX = 31; // Card that lands under center needle at end of spin

type RarityTier = {
  name: string;
  bottomBar: string;
  borderGlow: string;
  bgGradient: string;
  radialGlow: string;
  badgeClass: string;
};

function getChampionRarityStyle(
  champ: Champion,
  isWinnerSlot: boolean
): RarityTier {
  if (isWinnerSlot) {
    return {
      name: "GOLD SPECIAL",
      bottomBar: "bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500",
      borderGlow:
        "border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_28px_rgba(245,158,11,0.55)]",
      bgGradient: "from-[#2d1f0b] via-[#161927] to-[#0d101a]",
      radialGlow: "radial-gradient(circle at 50% 42%, rgba(251,191,36,0.38), transparent 70%)",
      badgeClass: "bg-amber-400 text-slate-950 font-black",
    };
  }
  switch (champ.damageType) {
    case "AD":
      return {
        name: "COVERT",
        bottomBar: "bg-gradient-to-r from-[#eb4b4b] to-[#f97316]",
        borderGlow: "border-[#eb4b4b]/40 hover:border-[#eb4b4b]/80",
        bgGradient: "from-[#281219] via-[#131724] to-[#0c0f18]",
        radialGlow: "radial-gradient(circle at 50% 45%, rgba(235,75,75,0.28), transparent 70%)",
        badgeClass: "bg-[#eb4b4b] text-white",
      };
    case "AP":
      return {
        name: "CLASSIFIED",
        bottomBar: "bg-gradient-to-r from-[#d32ce6] to-[#38bdf8]",
        borderGlow: "border-[#d32ce6]/40 hover:border-[#d32ce6]/80",
        bgGradient: "from-[#24122b] via-[#131724] to-[#0c0f18]",
        radialGlow: "radial-gradient(circle at 50% 45%, rgba(211,44,230,0.26), transparent 70%)",
        badgeClass: "bg-[#d32ce6] text-white",
      };
    case "MIXED":
      return {
        name: "RESTRICTED",
        bottomBar: "bg-gradient-to-r from-[#8847ff] to-[#c084fc]",
        borderGlow: "border-[#8847ff]/40 hover:border-[#8847ff]/80",
        bgGradient: "from-[#1c1330] via-[#131724] to-[#0c0f18]",
        radialGlow: "radial-gradient(circle at 50% 45%, rgba(136,71,255,0.28), transparent 70%)",
        badgeClass: "bg-[#8847ff] text-white",
      };
    case "TANK":
    default:
      return {
        name: "MIL-SPEC",
        bottomBar: "bg-gradient-to-r from-[#4b69ff] to-[#2dd4bf]",
        borderGlow: "border-[#4b69ff]/40 hover:border-[#4b69ff]/80",
        bgGradient: "from-[#111c2d] via-[#131724] to-[#0c0f18]",
        radialGlow: "radial-gradient(circle at 50% 45%, rgba(75,105,255,0.26), transparent 70%)",
        badgeClass: "bg-[#4b69ff] text-white",
      };
  }
}

/**
 * Deterministic strip builder for SSR & initial hydration (NEVER uses Math.random)
 */
function buildDeterministicReelStrip(
  pool: Champion[],
  winner: Champion | null
): Champion[] {
  const safePool = pool.length > 0 ? pool : winner ? [winner] : [];
  if (safePool.length === 0) return [];

  const strip: Champion[] = [];
  for (let i = 0; i < TOTAL_REEL_CARDS; i++) {
    if (i === WINNING_INDEX && winner) {
      strip.push(winner);
      continue;
    }
    let idx = (i * 7 + 3) % safePool.length;
    let candidate = safePool[idx];
    if (
      winner &&
      safePool.length > 1 &&
      (i === WINNING_INDEX - 1 || i === WINNING_INDEX + 1) &&
      candidate.id === winner.id
    ) {
      candidate = safePool[(idx + 1) % safePool.length];
    }
    strip.push(candidate);
  }
  return strip;
}

/**
 * Randomized strip builder used ONLY inside client-side effects when spinning
 */
function buildRandomReelStrip(
  pool: Champion[],
  winner: Champion | null
): Champion[] {
  const safePool = pool.length > 0 ? pool : winner ? [winner] : [];
  if (safePool.length === 0) return [];

  const strip: Champion[] = [];
  for (let i = 0; i < TOTAL_REEL_CARDS; i++) {
    if (i === WINNING_INDEX && winner) {
      strip.push(winner);
      continue;
    }
    let candidate = safePool[Math.floor(Math.random() * safePool.length)];
    if (
      winner &&
      safePool.length > 2 &&
      (i === WINNING_INDEX - 1 || i === WINNING_INDEX + 1)
    ) {
      const others = safePool.filter((c) => c.id !== winner.id);
      if (others.length > 0) {
        candidate = others[Math.floor(Math.random() * others.length)];
      }
    }
    if (
      strip.length > 0 &&
      safePool.length > 1 &&
      candidate.id === strip[i - 1].id
    ) {
      const alt = safePool.filter((c) => c.id !== strip[i - 1].id);
      if (alt.length > 0) {
        candidate = alt[Math.floor(Math.random() * alt.length)];
      }
    }
    strip.push(candidate);
  }
  return strip;
}

export function SkinClubLaneRow({
  role,
  champion,
  candidatePool,
  spinTriggerId,
  spinDurationMs,
  isRolling,
  isLocked,
  isSelectedForReroll,
  onRerollLane,
  onToggleLock,
  onToggleSelect,
  onTickSound,
}: SkinClubLaneRowProps) {
  // Deterministic initial state prevents any SSR/client hydration mismatch
  const [reelItems, setReelItems] = useState<Champion[]>(() =>
    buildDeterministicReelStrip(candidatePool, champion)
  );
  const startOffsetPx = -(START_INDEX * STEP + CARD_W / 2);
  const exactWinnerOffsetPx = -(WINNING_INDEX * STEP + CARD_W / 2);

  const [translateX, setTranslateX] = useState<number>(exactWinnerOffsetPx);
  const [transitionCss, setTransitionCss] = useState<string>("none");
  const [landedHighlight, setLandedHighlight] = useState<boolean>(true);

  const prevSpinTriggerRef = useRef<number>(spinTriggerId);
  const snapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync reel when champion changes without spinning (e.g., clicking history item)
  useEffect(() => {
    if (!isRolling && spinTriggerId === prevSpinTriggerRef.current && champion) {
      setReelItems((prev) => {
        if (prev[WINNING_INDEX]?.id === champion.id) return prev;
        return buildRandomReelStrip(candidatePool, champion);
      });
      setTransitionCss("none");
      setTranslateX(exactWinnerOffsetPx);
      setLandedHighlight(true);
    }
  }, [champion, isRolling, spinTriggerId, candidatePool, exactWinnerOffsetPx]);

  // Trigger Skin.Club horizontal roulette spin when spinTriggerId increments
  useEffect(() => {
    if (spinTriggerId === prevSpinTriggerRef.current) return;
    prevSpinTriggerRef.current = spinTriggerId;

    if (!champion) return;

    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);

    // 1. Build fresh decoy strip with the target winner at WINNING_INDEX
    const freshStrip = buildRandomReelStrip(candidatePool, champion);
    setReelItems(freshStrip);
    setLandedHighlight(false);

    // 2. Instantly reset track to START_INDEX without transition
    setTransitionCss("none");
    setTranslateX(startOffsetPx);

    // Sub-card random landing offset (like Skin.Club landing slightly off-center then snapping)
    const randomJitter = Math.floor((Math.random() - 0.5) * (CARD_W * 0.6));
    const spinTargetPx = exactWinnerOffsetPx + randomJitter;

    // 3. Schedule audio ticks that slow down along the cubic-bezier curve
    const tickTimers: NodeJS.Timeout[] = [];
    if (onTickSound) {
      const totalTicks = 18;
      for (let t = 1; t <= totalTicks; t++) {
        const progress = Math.pow(t / totalTicks, 2.15);
        const delay = Math.round(progress * (spinDurationMs - 180));
        tickTimers.push(
          setTimeout(() => {
            onTickSound();
          }, delay)
        );
      }
    }

    // 4. Start smooth deceleration spin on next frame
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setTransitionCss(
          `transform ${spinDurationMs}ms cubic-bezier(0.08, 0.82, 0.14, 1)`
        );
        setTranslateX(spinTargetPx);
      });
    });

    // 5. Snap smoothly to exact center and trigger gold winner flash at end of spin
    snapTimerRef.current = setTimeout(() => {
      setTransitionCss("transform 260ms cubic-bezier(0.25, 1, 0.5, 1)");
      setTranslateX(exactWinnerOffsetPx);
      setLandedHighlight(true);
    }, spinDurationMs - 120);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      tickTimers.forEach((t) => clearTimeout(t));
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, [
    spinTriggerId,
    champion,
    candidatePool,
    spinDurationMs,
    startOffsetPx,
    exactWinnerOffsetPx,
    onTickSound,
  ]);

  return (
    <article
      className={`relative rounded-2xl overflow-hidden border transition-all select-none bg-[#0d111d] ${
        isSelectedForReroll
          ? "border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
          : isLocked
          ? "border-amber-400 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
          : "border-[#1f273d] hover:border-[#2e3a59] shadow-lg"
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* LEFT COLUMN: Skin.Club Case Identity & Lane Controls */}
        <div className="lg:w-[240px] shrink-0 p-3 sm:p-3.5 bg-gradient-to-br from-[#13192b] via-[#0f1422] to-[#0b0e18] border-b lg:border-b-0 lg:border-r border-[#1f273d] flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl bg-[#090c15] border border-[#26304d] flex items-center justify-center shrink-0"
              style={{
                color: role.accentColor,
                boxShadow: `0 0 20px ${role.accentColor}30`,
              }}
            >
              <RoleIcon role={role.id} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: role.accentColor }}
                >
                  ĐƯỜNG {role.shortName}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1a2236] text-slate-300 border border-[#283350]">
                  {candidatePool.length} tướng
                </span>
                {isLocked && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ĐÃ KHÓA
                  </span>
                )}
              </div>
              <h2 className="text-sm font-black text-white truncate">
                {role.name}
              </h2>
              <p className="hidden lg:block text-[11px] text-slate-400 truncate mt-0.5">
                {role.englishName}
              </p>
            </div>
          </div>

          {/* Lane Controls: Spin Single Row + Select + Lock */}
          <div className="flex items-center gap-1.5 shrink-0 lg:mt-2">
            <button
              type="button"
              onClick={onRerollLane}
              disabled={isRolling}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_16px_rgba(245,158,11,0.35)] cursor-pointer disabled:opacity-50 transition-all"
            >
              <Dices
                className={`w-3.5 h-3.5 ${isRolling ? "animate-spin" : ""}`}
              />
              <span>
                {isRolling ? "Đang mở..." : `Mở ${role.shortName}`}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleSelect}
              title={
                isSelectedForReroll
                  ? "Bỏ chọn đường này"
                  : "Tích chọn đường này để mở theo nhóm"
              }
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isSelectedForReroll
                  ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                  : "bg-[#171e31] text-slate-300 border-[#26314f] hover:border-cyan-400 hover:text-white"
              }`}
            >
              {isSelectedForReroll ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleLock}
              title={
                isLocked
                  ? "Mở khóa đường này"
                  : "Khóa cố định tướng đường này khi Mở Tất Cả"
              }
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isLocked
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  : "bg-[#171e31] text-slate-300 border-[#26314f] hover:border-amber-400 hover:text-white"
              }`}
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Skin.Club Horizontal Case-Opening Roulette Track */}
        <div className="relative flex-1 h-[160px] sm:h-[168px] overflow-hidden bg-[#070a12] flex items-center">
          {/* Subtle Skin.Club Center Spotlight & Grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.16), transparent 58%)",
            }}
          />

          {/* Top & Bottom subtle track rails */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          {/* Horizontal Sliding Reel Strip anchored at left: 50% */}
          <div
            className="absolute top-1/2 left-1/2 flex items-center will-change-transform"
            style={{
              gap: `${CARD_GAP}px`,
              transform: `translate3d(${translateX}px, -50%, 0)`,
              transition: transitionCss,
            }}
          >
            {reelItems.map((item, idx) => {
              const isWinnerCard =
                idx === WINNING_INDEX && landedHighlight && !isRolling;
              const rarity = getChampionRarityStyle(item, isWinnerCard);

              return (
                <div
                  key={`${item.id}-${idx}`}
                  style={{ width: `${CARD_W}px` }}
                  className={`relative h-[136px] sm:h-[142px] shrink-0 rounded-xl overflow-hidden border bg-gradient-to-b ${
                    rarity.bgGradient
                  } ${
                    rarity.borderGlow
                  } flex flex-col justify-between transition-transform duration-200 ${
                    isWinnerCard ? "scale-105 z-20" : "opacity-90"
                  }`}
                >
                  {/* Inner Weapon-Skin Radial Rarity Glow */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: rarity.radialGlow }}
                  />

                  {/* Top Rarity & Damage Tag */}
                  <div className="relative z-10 px-2 pt-1.5 flex items-center justify-between gap-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-300/90 truncate">
                      {item.classes[0] || role.shortName}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${rarity.badgeClass}`}
                    >
                      {item.damageType}
                    </span>
                  </div>

                  {/* Center Champion Avatar with Glow */}
                  <div className="relative z-10 flex flex-col items-center justify-center px-2">
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shadow-md bg-slate-950 ${
                        isWinnerCard
                          ? "border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                          : "border-white/15"
                      }`}
                    >
                      <img
                        src={getChampionSquareUrl(item.id)}
                        alt={item.name}
                        width={64}
                        height={64}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Bottom Champion Name + Skin.Club Rarity Color Strip */}
                  <div className="relative z-10">
                    <div className="px-2 pb-1.5 text-center">
                      <div
                        className={`text-xs font-black truncate ${
                          isWinnerCard ? "text-amber-300" : "text-white"
                        }`}
                      >
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {item.title}
                      </div>
                    </div>
                    <div className={`h-1.5 w-full ${rarity.bottomBar}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Left & Right Edge Dark Vignette Gradients (Skin.Club style depth) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#070a12] via-[#070a12]/85 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#070a12] via-[#070a12]/85 to-transparent z-20" />

          {/* CENTER LASER NEEDLE / POINTER (Skin.Club / CS2 Case Marker) */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center justify-between">
            {/* Top Triangle Pointer */}
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[11px] border-t-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
            {/* Center Vertical Laser Line */}
            <div
              className={`w-[2px] flex-1 transition-all duration-200 ${
                isRolling
                  ? "bg-amber-300 shadow-[0_0_16px_#fbbf24]"
                  : "bg-amber-400/90 shadow-[0_0_12px_#f59e0b]"
              }`}
            />
            {/* Bottom Triangle Pointer */}
            <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[11px] border-b-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
          </div>
        </div>

        {/* RIGHT COLUMN: Unboxed Winning Champion Showcase */}
        <div className="lg:w-[275px] shrink-0 relative overflow-hidden bg-[#101524] border-t lg:border-t-0 lg:border-l border-[#1f273d] p-3 sm:p-3.5 flex items-center justify-between gap-3">
          {champion && !isRolling ? (
            <>
              {/* Subtle Splash Art Background */}
              <img
                src={getChampionLoadingUrl(champion.id)}
                alt={champion.name}
                width={308}
                height={560}
                loading="lazy"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover object-top opacity-30 scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b0f1b]/95 via-[#0b0f1b]/80 to-[#0b0f1b]/55" />

              <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.45)] shrink-0 bg-slate-950">
                  <img
                    src={getChampionSquareUrl(champion.id)}
                    alt={champion.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-400/20 border border-amber-400/50 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>TƯỚNG ĐÃ MỞ</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                    {champion.name}
                  </h3>
                  <p className="text-[11px] text-amber-200/80 truncate">
                    {champion.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {champion.classes.map((cls) => (
                      <span
                        key={cls}
                        className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-bold text-slate-200 border border-white/15"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="relative z-10 w-full flex items-center gap-3 py-1">
              <div className="w-12 h-12 rounded-xl bg-[#182036] border border-amber-400/40 flex items-center justify-center shrink-0 animate-pulse">
                <Dices className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Đang mở tướng {role.shortName}...
                </div>
                <div className="text-[11px] text-slate-400">
                  Kim chỉ laser đang chọn tướng...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
