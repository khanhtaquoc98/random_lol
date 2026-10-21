"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, BrainCircuit, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-10 py-2.5 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black shadow-sm">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="block text-xs sm:text-base font-black tracking-wider uppercase text-slate-900 group-hover:text-teal-600 transition-colors">
              HEXTECH <span className="text-amber-600">LOL HUB</span>
            </span>
            <span className="hidden xs:block text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Randomizer &amp; AI Match Coach
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold uppercase tracking-wider border transition-all ${
              pathname === "/"
                ? "bg-amber-50 text-amber-900 border-amber-400 shadow-xs"
                : "bg-slate-100/80 text-slate-600 border-slate-200 hover:border-amber-300 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span>Random 5 Đường</span>
          </Link>

          <Link
            href="/match-analyzer"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold uppercase tracking-wider border transition-all ${
              pathname?.startsWith("/match-analyzer")
                ? "bg-teal-50 text-teal-900 border-teal-500 shadow-xs"
                : "bg-slate-100/80 text-slate-600 border-slate-200 hover:border-teal-300 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
            <span>AI Phân Tích</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
