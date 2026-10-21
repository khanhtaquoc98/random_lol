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
    className: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  AP: {
    label: "Sức Mạnh Phép Thuật (AP)",
    className: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  },
  MIXED: {
    label: "Sát Thương Hỗn Hợp",
    className: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  TANK: {
    label: "Chống Chịu / Mở Giao Tranh",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
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
      className={`champ-card relative flex flex-col rounded-xl overflow-hidden border bg-[#091428]/90 backdrop-blur-md select-none ${
        isSelectedForReroll
          ? "border-[#0AC8B9] shadow-[0_0_25px_rgba(10,200,185,0.28)]"
          : isLocked
          ? "border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.18)]"
          : "border-[#C8AA6E]/35 hover:border-[#C8AA6E]/80 shadow-[0_10px_30px_rgba(0,0,0,0.65)]"
      }`}
    >
      {/* Top Lane Role Bar */}
      <div
        className={`relative z-10 flex items-center justify-between px-3.5 py-2.5 border-b border-[#C8AA6E]/25 bg-gradient-to-r ${role.badgeBg}`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#C8AA6E]/50 bg-[#010A13]/80 shadow-inner"
            style={{ color: role.accentColor }}
          >
            <RoleIcon role={role.id} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-extrabold tracking-widest uppercase"
                style={{ color: role.accentColor }}
              >
                {role.shortName}
              </span>
              <span className="text-[11px] text-[#C8AA6E]/70">• {poolCount} tướng</span>
            </div>
            <h2 className="text-sm font-bold text-[#F0E6D2] leading-tight">
              {role.name}
            </h2>
          </div>
        </div>

        {/* Action Toggles: Select for multi-reroll & Lock lane */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSelect}
            title={
              isSelectedForReroll
                ? "Bỏ chọn đường này khỏi danh sách roll lại"
                : "Chọn đường này để roll lại theo nhóm"
            }
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border ${
              isSelectedForReroll
                ? "bg-[#0AC8B9]/20 text-[#0AC8B9] border-[#0AC8B9]/60"
                : "bg-[#010A13]/60 text-[#C8AA6E]/70 border-transparent hover:border-[#C8AA6E]/40 hover:text-[#F0E6D2]"
            }`}
          >
            {isSelectedForReroll ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Chọn</span>
          </button>

          <button
            type="button"
            onClick={onToggleLock}
            title={
              isLocked
                ? "Mở khóa đường này (cho phép đổi tướng khi Roll Tất Cả)"
                : "Khóa đường này (giữ nguyên tướng khi Roll Tất Cả)"
            }
            className={`p-1.5 rounded transition-colors border ${
              isLocked
                ? "bg-amber-500/25 text-amber-300 border-amber-500/60"
                : "bg-[#010A13]/60 text-[#C8AA6E]/70 border-transparent hover:border-[#C8AA6E]/40 hover:text-[#F0E6D2]"
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
      <div className="relative h-[320px] sm:h-[350px] w-full overflow-hidden bg-[#030914] flex flex-col justify-end">
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
                  isRolling ? "scale-110 blur-sm brightness-125" : "scale-100 blur-0"
                }`}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#091428] via-[#0A1E3C] to-[#010A13] p-4 text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black border-2 border-[#C8AA6E] mb-3 shadow-lg"
                  style={{
                    backgroundColor: `${role.accentColor}22`,
                    color: role.accentColor,
                  }}
                >
                  {champion.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
            )}

            {/* Dark Vignette Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#010A13] via-[#010A13]/65 to-transparent" />

            {/* Status Badges inside Artwork */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/90 text-[#010A13] shadow-lg">
                  <Lock className="w-3 h-3" /> Đã Khóa
                </span>
              ) : (
                <span />
              )}

              {isSelectedForReroll && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#0AC8B9] text-[#010A13] shadow-lg">
                  ✓ Đã chọn Roll lại
                </span>
              )}
            </div>

            {/* Champion Info Overlay */}
            <div
              className={`relative z-10 p-4 transition-all duration-200 ${
                isRolling ? "opacity-60 translate-y-1" : "opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-end gap-3 mb-2.5">
                {/* Square Champion Icon */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-[#C8AA6E] shadow-md shrink-0 bg-[#091428]">
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
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#C8AA6E]">
                      {champion.name[0]}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AA6E] truncate">
                    {champion.title}
                  </p>
                  <h3 className="text-xl font-black tracking-wide text-[#F0E6D2] truncate drop-shadow">
                    {champion.name}
                  </h3>
                </div>
              </div>

              {/* Class & Damage Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {champion.classes.map((cls) => (
                  <span
                    key={cls}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-[#C8AA6E]/15 text-[#F0E6D2] border border-[#C8AA6E]/35"
                  >
                    {cls}
                  </span>
                ))}
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                    DAMAGE_BADGE[champion.damageType].className
                  }`}
                >
                  {champion.damageType}
                </span>
              </div>

              {/* Viable Lanes & Difficulty */}
              <div className="flex items-center justify-between text-[11px] text-[#C8AA6E]/80 pt-1.5 border-t border-[#C8AA6E]/20">
                <span>
                  Vị trí chuẩn:{" "}
                  <strong className="text-[#F0E6D2]">
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
                            ? "bg-[#0AC8B9]"
                            : "bg-[#C8AA6E]/25"
                        }`}
                      />
                    ))}
                  </span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[#C8AA6E]/60">
            <Sparkles className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">Chưa có tướng được chọn</p>
          </div>
        )}
      </div>

      {/* Individual Lane Reroll Button Footer */}
      <div className="p-3 bg-[#050E1D] border-t border-[#C8AA6E]/25">
        <button
          type="button"
          onClick={onRerollLane}
          disabled={isRolling}
          className="hextech-action-btn w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider text-[#F0E6D2] bg-gradient-to-r from-[#091428] via-[#0A2342] to-[#091428] hover:from-[#0AC8B9]/25 hover:via-[#0AC8B9]/15 hover:to-[#C8AA6E]/25 border border-[#C8AA6E]/50 hover:border-[#0AC8B9] shadow-md disabled:opacity-50 cursor-pointer"
        >
          <Dices
            className={`w-4 h-4 text-[#0AC8B9] ${
              isRolling ? "animate-spin" : ""
            }`}
          />
          <span>Roll lại {role.shortName}</span>
        </button>
      </div>
    </article>
  );
}
