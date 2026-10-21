"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, BrainCircuit, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#010A13]/90 backdrop-blur-md border-b border-[#C8AA6E]/35">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C8AA6E] to-[#785A28] flex items-center justify-center text-[#010A13] font-black shadow-[0_0_15px_rgba(200,170,110,0.35)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-sm sm:text-base font-black tracking-wider uppercase text-[#F0E6D2] group-hover:text-[#0AC8B9] transition-colors">
              HEXTECH <span className="text-[#C8AA6E]">LOL HUB</span>
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-[#C8AA6E]/75">
              Randomizer & AI Match Coach
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider border transition-all ${
              pathname === "/"
                ? "bg-gradient-to-r from-[#C8AA6E]/25 to-[#0AC8B9]/20 text-[#F0E6D2] border-[#C8AA6E] shadow-[0_0_15px_rgba(200,170,110,0.25)]"
                : "bg-[#091428]/60 text-[#C8AA6E]/80 border-transparent hover:border-[#C8AA6E]/40 hover:text-[#F0E6D2]"
            }`}
          >
            <Dices className="w-4 h-4 text-[#C8AA6E]" />
            <span>Random 5 Đường</span>
          </Link>

          <Link
            href="/match-analyzer"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider border transition-all ${
              pathname?.startsWith("/match-analyzer")
                ? "bg-gradient-to-r from-[#0AC8B9]/25 to-[#C8AA6E]/20 text-[#F0E6D2] border-[#0AC8B9] shadow-[0_0_15px_rgba(10,200,185,0.28)]"
                : "bg-[#091428]/60 text-[#C8AA6E]/80 border-transparent hover:border-[#C8AA6E]/40 hover:text-[#F0E6D2]"
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-[#0AC8B9]" />
            <span>AI Phân Tích Trận Đấu</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
