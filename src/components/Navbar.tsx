"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, BrainCircuit, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#0a0e19]/95 backdrop-blur-md border-b border-[#1e2742] shadow-lg">
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
            <span className="block text-xs sm:text-base font-black tracking-wider uppercase text-white group-hover:text-amber-300 transition-colors">
              Random <span className="text-amber-500">LOL HUB</span>
            </span>
            <span className="hidden xs:block text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              5-Lane Roulette &amp; AI Match Coach
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
                : "bg-[#141b2e] text-slate-200 border-[#263254] hover:border-amber-400 hover:text-amber-300"
            }`}
          >
            <Dices
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                pathname === "/" ? "text-slate-950" : "text-amber-400"
              }`}
            />
            <span>Mở Tướng 5 Đường</span>
          </Link>

          <Link
            href="/match-analyzer"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-black uppercase tracking-wider border transition-all ${
              pathname?.startsWith("/match-analyzer")
                ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                : "bg-[#141b2e] text-slate-200 border-[#263254] hover:border-cyan-400 hover:text-cyan-300"
            }`}
          >
            <BrainCircuit
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                pathname?.startsWith("/match-analyzer")
                  ? "text-slate-950"
                  : "text-cyan-400"
              }`}
            />
            <span>AI Phân Tích</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
