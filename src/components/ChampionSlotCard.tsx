"use client";

import React, { useState } from "react";
import {
  Champion,
  RoleInfo,
  getChampionLoadingUrl,
  getChampionSquareUrl,
} from "@/data/champions";
import { RoleIcon } from "./RoleIcon";
import { Dices, Lock, Unlock, CheckSquare, Square, Sparkles } from "lucide-react";

interface ChampionSlotCardProps {
  role: RoleInfo;
  champion: Champion | null;
  isRolling: boolean;
  isLocked: boolean;
  isSelectedForReroll: boolean;
  poolCount: number;
  isPriorityImage?: boolean;
  onRerollLane: () => void;
  onToggleLock: () => void;
  onToggleSelect: () => void;
}

const DAMAGE_BADGE: Record<
  Champion["damageType"],
  { label: string; className: string }
> = {
  AD: {
    label: "Sát Thương Vật Lý (AD)",
    className: "bg-orange-500/85 text-white border-orange-300/60",
  },
  AP: {
    label: "Sức Mạnh Phép Thuật (AP)",
    className: "bg-sky-500/85 text-white border-sky-300/60",
  },
  MIXED: {
    label: "Sát Thương Hỗn Hợp",
    className: "bg-purple-500/85 text-white border-purple-300/60",
  },
  TANK: {
    label: "Chống Chịu / Mở Giao Tranh",
    className: "bg-emerald-600/85 text-white border-emerald-300/60",
  },
};

export function ChampionSlotCard({
  role,
  champion,
  isRolling,
  isLocked,
  isSelectedForReroll,
  poolCount,
  isPriorityImage = false,
  onRerollLane,
  onToggleLock,
  onToggleSelect,
}: ChampionSlotCardProps) {
  const [imgError, setImgError] = useState<string | null>(null);
  const [squareError, setSquareError] = useState<string | null>(null);

  const showSplash = champion && imgError !== champion.id;
  const showSquare = champion && squareError !== champion.id;

  return (
    <article
      className={`champ-card relative flex flex-col rounded-2xl overflow-hidden border bg-[#101524] select-none ${
        isSelectedForReroll
          ? "border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg"
          : isLocked
          ? "border-amber-400 ring-2 ring-amber-500/30 shadow-md"
          : "border-[#1f2844] hover:border-amber-400/70 shadow-lg"
      }`}
    >
      {/* Top Lane Role Bar */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2.5 border-b border-[#1f2844] bg-[#0b0e18]">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#263254] bg-[#141b2e] shrink-0"
            style={{ color: role.accentColor }}
          >
            <RoleIcon role={role.id} className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-extrabold tracking-widest uppercase"
                style={{ color: role.accentColor }}
              >
                {role.shortName}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                • {poolCount} tướng
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
              {role.name}
            </h2>
          </div>
        </div>

        {/* Action Toggles: Select for multi-reroll & Lock lane */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSelect}
            title={
              isSelectedForReroll
                ? "Bỏ chọn đường này khỏi danh sách mở lại"
                : "Chọn đường này để mở lại theo nhóm"
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors border cursor-pointer ${
              isSelectedForReroll
                ? "bg-cyan-400 text-slate-950 border-cyan-300"
                : "bg-[#161e33] text-slate-300 border-[#263254] hover:border-cyan-400 hover:text-white"
            }`}
          >
            {isSelectedForReroll ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span className="hidden xs:inline">Chọn</span>
          </button>

          <button
            type="button"
            onClick={onToggleLock}
            title={
              isLocked
                ? "Mở khóa đường này"
                : "Khóa đường này (giữ nguyên tướng khi Mở Tất Cả)"
            }
            className={`p-1.5 rounded-md transition-colors border cursor-pointer ${
              isLocked
                ? "bg-amber-400 text-slate-950 border-amber-300"
                : "bg-[#161e33] text-slate-300 border-[#263254] hover:border-amber-400 hover:text-white"
            }`}
          >
            {isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Champion Splash & Details Area */}
      <div className="relative h-[280px] sm:h-[320px] lg:h-[340px] w-full overflow-hidden bg-slate-900 flex flex-col justify-end">
        {champion ? (
          <>
            {/* Splash Art Image */}
            {showSplash ? (
              <img
                src={getChampionLoadingUrl(champion.id)}
                alt={`${champion.name} - ${champion.title}`}
                width={308}
                height={560}
                {...(isPriorityImage ? { fetchPriority: "high" } : {})}
                onError={() => setImgError(champion.id)}
                className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-300 ${
                  isRolling
                    ? "scale-110 blur-sm brightness-125"
                    : "scale-100 blur-0"
                }`}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 p-4 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black border-2 border-amber-400 mb-3 shadow-lg bg-slate-900 text-amber-300">
                  {champion.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
            )}

            {/* Bottom Scrim Overlay for Text Readability over Artwork */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent" />

            {/* Status Badges inside Artwork */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-md">
                  <Lock className="w-3 h-3" /> Đã Khóa
                </span>
              ) : (
                <span />
              )}

              {isSelectedForReroll && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500 text-white shadow-md">
                  ✓ Đã chọn Roll lại
                </span>
              )}
            </div>

            {/* Champion Info Overlay */}
            <div
              className={`relative z-10 p-3.5 transition-all duration-200 ${
                isRolling
                  ? "opacity-60 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-end gap-2.5 mb-2">
                {/* Square Champion Icon */}
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 border-amber-400 shadow-md shrink-0 bg-slate-900">
                  {showSquare ? (
                    <img
                      src={getChampionSquareUrl(champion.id)}
                      alt={champion.name}
                      width={48}
                      height={48}
                      onError={() => setSquareError(champion.id)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-amber-300">
                      {champion.name[0]}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-300 truncate">
                    {champion.title}
                  </p>
                  <h3 className="text-lg sm:text-xl font-black tracking-wide text-white truncate drop-shadow">
                    {champion.name}
                  </h3>
                </div>
              </div>

              {/* Class & Damage Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {champion.classes.map((cls) => (
                  <span
                    key={cls}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded bg-white/15 text-white border border-white/25 backdrop-blur-xs"
                  >
                    {cls}
                  </span>
                ))}
                <span
                  className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded border ${
                    DAMAGE_BADGE[champion.damageType].className
                  }`}
                >
                  {champion.damageType}
                </span>
              </div>

              {/* Viable Lanes & Difficulty */}
              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-white/15">
                <span>
                  Vị trí:{" "}
                  <strong className="text-white">
                    {champion.roles.join(" / ")}
                  </strong>
                </span>
                <span className="flex items-center gap-1" title="Độ khó">
                  Độ khó:
                  <span className="inline-flex gap-0.5 ml-0.5">
                    {[1, 2, 3].map((lvl) => (
                      <span
                        key={lvl}
                        className={`w-2 h-2 rounded-xs ${
                          lvl <= champion.difficulty
                            ? "bg-teal-400"
                            : "bg-white/25"
                        }`}
                      />
                    ))}
                  </span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400">
            <Sparkles className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">Chưa có tướng được chọn</p>
          </div>
        )}
      </div>

      {/* Individual Lane Reroll Button Footer */}
      <div className="p-2.5 sm:p-3 bg-[#0b0e18] border-t border-[#1f2844]">
        <button
          type="button"
          onClick={onRerollLane}
          disabled={isRolling}
          className="hextech-action-btn w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 cursor-pointer"
        >
          <Dices className={`w-4 h-4 ${isRolling ? "animate-spin" : ""}`} />
          <span>Mở lại {role.shortName}</span>
        </button>
      </div>
    </article>
  );
}
