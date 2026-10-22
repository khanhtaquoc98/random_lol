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

const CARD_W = 124; // px width of each skin-case item card
const CARD_GAP = 10; // px gap between cards
const STEP = CARD_W + CARD_GAP; // 134px per card step
const TOTAL_REEL_CARDS = 38;
const START_INDEX = 4; // Card initially under center needle before spin
const WINNING_INDEX = 31; // Card that lands under center needle at end of spin

type RarityTier = {
  name: string;
  bottomBar: string;
  borderGlow: string;
  bgGradient: string;
  badgeClass: string;
};

function getChampionRarityStyle(
  champ: Champion,
  isWinnerSlot: boolean
): RarityTier {
  if (isWinnerSlot) {
    return {
      name: "MYTHIC DROP",
      bottomBar: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500",
      borderGlow:
        "border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.45)]",
      bgGradient: "from-amber-950/90 via-slate-900 to-slate-950",
      badgeClass: "bg-amber-500 text-slate-950 font-black",
    };
  }
  switch (champ.damageType) {
    case "AD":
      return {
        name: "COVERT AD",
        bottomBar: "bg-gradient-to-r from-rose-500 to-orange-500",
        borderGlow: "border-rose-500/40",
        bgGradient: "from-rose-950/75 via-slate-900 to-slate-950",
        badgeClass: "bg-rose-500/90 text-white",
      };
    case "AP":
      return {
        name: "CLASSIFIED AP",
        bottomBar: "bg-gradient-to-r from-sky-400 to-indigo-500",
        borderGlow: "border-sky-500/40",
        bgGradient: "from-sky-950/75 via-slate-900 to-slate-950",
        badgeClass: "bg-sky-500/90 text-white",
      };
    case "MIXED":
      return {
        name: "RESTRICTED MIX",
        bottomBar: "bg-gradient-to-r from-purple-500 to-fuchsia-500",
        borderGlow: "border-purple-500/40",
        bgGradient: "from-purple-950/75 via-slate-900 to-slate-950",
        badgeClass: "bg-purple-500/90 text-white",
      };
    case "TANK":
    default:
      return {
        name: "VANGUARD TANK",
        bottomBar: "bg-gradient-to-r from-emerald-400 to-teal-500",
        borderGlow: "border-emerald-500/40",
        bgGradient: "from-emerald-950/75 via-slate-900 to-slate-950",
        badgeClass: "bg-emerald-500/90 text-white",
      };
  }
}

function buildReelStrip(
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
    // Pick random decoy, avoiding placing the exact winner right next to WINNING_INDEX
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
    // Avoid immediate duplicate back-to-back
    if (strip.length > 0 && safePool.length > 1 && candidate.id === strip[i - 1].id) {
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
  const [reelItems, setReelItems] = useState<Champion[]>(() =>
    buildReelStrip(candidatePool, champion)
  );
  const startOffsetPx = -(START_INDEX * STEP + CARD_W / 2);
  const exactWinnerOffsetPx = -(WINNING_INDEX * STEP + CARD_W / 2);

  const [translateX, setTranslateX] = useState<number>(exactWinnerOffsetPx);
  const [transitionCss, setTransitionCss] = useState<string>("none");
  const [landedHighlight, setLandedHighlight] = useState<boolean>(true);

  const prevSpinTriggerRef = useRef<number>(spinTriggerId);
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // When champion changes externally (e.g., restored from history without spinning)
  useEffect(() => {
    if (!isRolling && spinTriggerId === prevSpinTriggerRef.current && champion) {
      setReelItems((prev) => {
        if (prev[WINNING_INDEX]?.id === champion.id) return prev;
        return buildReelStrip(candidatePool, champion);
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

    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);

    // 1. Build fresh decoy strip with the target winner at WINNING_INDEX
    const freshStrip = buildReelStrip(candidatePool, champion);
    setReelItems(freshStrip);
    setLandedHighlight(false);

    // 2. Instantly reset track to START_INDEX without transition
    setTransitionCss("none");
    setTranslateX(startOffsetPx);

    // Sub-card random landing offset (like CS2 / Skin.Club landing slightly off-center then snapping)
    const randomJitter = Math.floor((Math.random() - 0.5) * (CARD_W * 0.62));
    const spinTargetPx = exactWinnerOffsetPx + randomJitter;

    // 3. Schedule audio ticks that slow down along the cubic-bezier curve
    if (onTickSound) {
      const totalTicks = 18;
      for (let t = 1; t <= totalTicks; t++) {
        const progress = Math.pow(t / totalTicks, 2.15);
        const delay = Math.round(progress * (spinDurationMs - 180));
        setTimeout(() => {
          onTickSound();
        }, delay);
      }
    }

    // 4. Start smooth deceleration spin on next frame
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setTransitionCss(
          `transform ${spinDurationMs}ms cubic-bezier(0.08, 0.82, 0.14, 1)`
        );
        setTranslateX(spinTargetPx);
      });
      return () => cancelAnimationFrame(raf2);
    });

    // 5. Snap smoothly to exact center and trigger gold winner flash at end of spin
    snapTimerRef.current = setTimeout(() => {
      setTransitionCss("transform 260ms cubic-bezier(0.25, 1, 0.5, 1)");
      setTranslateX(exactWinnerOffsetPx);
      setLandedHighlight(true);
    }, spinDurationMs - 120);

    return () => {
      cancelAnimationFrame(raf1);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
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
      className={`relative rounded-2xl overflow-hidden border transition-all select-none bg-slate-950 ${
        isSelectedForReroll
          ? "border-teal-400 ring-2 ring-teal-500/30 shadow-lg"
          : isLocked
          ? "border-amber-400 ring-2 ring-amber-500/30 shadow-md"
          : "border-slate-800 hover:border-slate-700 shadow-md"
      }`}
    >
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* LEFT COLUMN: Lane Identity & Controls */}
        <div className="lg:w-[235px] shrink-0 p-3 sm:p-3.5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner"
              style={{
                color: role.accentColor,
                boxShadow: `0 0 16px ${role.accentColor}25`,
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
                  {role.shortName}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {candidatePool.length} tướng
                </span>
                {isLocked && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    KHÓA
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-amber-400 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <Dices
                className={`w-3.5 h-3.5 ${isRolling ? "animate-spin" : ""}`}
              />
              <span>{isRolling ? "Đang quay..." : `Quay ${role.shortName}`}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSelect}
              title={
                isSelectedForReroll
                  ? "Bỏ chọn đường này"
                  : "Tích chọn đường này để quay theo nhóm"
              }
              className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                isSelectedForReroll
                  ? "bg-teal-500 text-slate-950 border-teal-400"
                  : "bg-slate-800/90 text-slate-300 border-slate-700 hover:border-teal-400 hover:text-white"
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
              className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                isLocked
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800/90 text-slate-300 border-slate-700 hover:border-amber-400 hover:text-white"
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
        <div className="relative flex-1 h-[156px] sm:h-[164px] overflow-hidden bg-[#0b101b] flex items-center">
          {/* Subtle Hex/Tech Grid & Center Spotlight Glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.28), transparent 60%)",
            }}
          />

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
              const isWinnerCard = idx === WINNING_INDEX && landedHighlight && !isRolling;
              const rarity = getChampionRarityStyle(item, isWinnerCard);

              return (
                <div
                  key={`${item.id}-${idx}`}
                  style={{ width: `${CARD_W}px` }}
                  className={`relative h-[132px] sm:h-[138px] shrink-0 rounded-xl overflow-hidden border bg-gradient-to-b ${
                    rarity.bgGradient
                  } ${rarity.borderGlow} flex flex-col justify-between transition-transform duration-200 ${
                    isWinnerCard ? "scale-105 z-20" : "opacity-90"
                  }`}
                >
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
                      className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-xl overflow-hidden border-2 shadow-md bg-slate-950 ${
                        isWinnerCard
                          ? "border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.6)]"
                          : "border-slate-700/80"
                      }`}
                    >
                      <img
                        src={getChampionSquareUrl(item.id)}
                        alt={item.name}
                        width={60}
                        height={60}
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
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#070a12] via-[#070a12]/80 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#070a12] via-[#070a12]/80 to-transparent z-20" />

          {/* CENTER LASER NEEDLE / POINTER (Skin.Club / CS2 Case Marker) */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center justify-between">
            {/* Top Triangle Pointer */}
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            {/* Center Vertical Laser Line */}
            <div
              className={`w-[2px] flex-1 transition-all duration-200 ${
                isRolling
                  ? "bg-amber-400 shadow-[0_0_14px_#fbbf24]"
                  : "bg-amber-400/85 shadow-[0_0_10px_#f59e0b]"
              }`}
            />
            {/* Bottom Triangle Pointer */}
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          </div>
        </div>

        {/* RIGHT COLUMN: Unboxed Winning Champion Showcase */}
        <div className="lg:w-[270px] shrink-0 relative overflow-hidden bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 sm:p-3.5 flex items-center justify-between gap-3">
          {champion && !isRolling ? (
            <>
              {/* Subtle Splash Art Background */}
              <img
                src={getChampionLoadingUrl(champion.id)}
                alt={champion.name}
                width={308}
                height={560}
                loading="lazy"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover object-top opacity-25 scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" />

              <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
                <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] shrink-0 bg-slate-950">
                  <img
                    src={getChampionSquareUrl(champion.id)}
                    alt={champion.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Tướng Trúng Hòm</span>
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
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-amber-500/40 flex items-center justify-center shrink-0 animate-pulse">
                <Dices className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Đang mở hòm {role.shortName}...
                </div>
                <div className="text-[11px] text-slate-400">
                  Kim chỉ laser đang chọn tướng
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
