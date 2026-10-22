"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, BrainCircuit, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isRandomizerPage = pathname === "/";

  return (
    <nav
      className={`sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors ${
        isRandomizerPage
          ? "bg-[#0a0e19]/95 border-[#1e2742] shadow-lg"
          : "bg-white/90 border-slate-200 shadow-xs"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-10 py-2.5 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span
              className={`block text-xs sm:text-base font-black tracking-wider uppercase transition-colors ${
                isRandomizerPage
                  ? "text-white group-hover:text-amber-300"
                  : "text-slate-900 group-hover:text-teal-600"
              }`}
            >
              SKIN.CLUB <span className="text-amber-500">LOL HUB</span>
            </span>
            <span
              className={`hidden xs:block text-[10px] uppercase tracking-widest font-semibold ${
                isRandomizerPage ? "text-slate-400" : "text-slate-500"
              }`}
            >
              5-Lane Case Opening &amp; AI Match Coach
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-black uppercase tracking-wider border transition-all ${
              pathname === "/"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                : "bg-slate-100/80 text-slate-600 border-slate-200 hover:border-amber-300 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Dices
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                pathname === "/" ? "text-slate-950" : "text-amber-600"
              }`}
            />
            <span>Mở Hòm 5 Đường</span>
          </Link>

          <Link
            href="/match-analyzer"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-black uppercase tracking-wider border transition-all ${
              pathname?.startsWith("/match-analyzer")
                ? "bg-teal-50 text-teal-900 border-teal-500 shadow-xs"
                : isRandomizerPage
                ? "bg-[#141b2e] text-slate-200 border-[#263254] hover:border-cyan-400 hover:text-cyan-300"
                : "bg-slate-100/80 text-slate-600 border-slate-200 hover:border-teal-300 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <BrainCircuit
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                isRandomizerPage ? "text-cyan-400" : "text-teal-600"
              }`}
            />
            <span>AI Phân Tích</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
