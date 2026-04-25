"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { AniListAnime } from "@/types";
import Link from "next/link";

interface AnimeRowProps {
  title:        string;
  anime:        AniListAnime[];
  viewMoreHref?: string;
  showRank?:    boolean;
  icon?:        React.ReactNode;
  badge?:       string;
}

export default function AnimeRow({ title, anime, viewMoreHref, showRank, icon, badge }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 640 : -640, behavior: "smooth" });
  };

  if (!anime || anime.length === 0) return null;

  return (
    <section className="relative">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="section-bar" />
          <div className="flex items-center gap-2.5">
            {icon && <span className="opacity-80">{icon}</span>}
            {title && <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>}
            {badge && (
              <span className="text-xs font-medium text-gray-400 bg-white/6 border border-white/8 px-2 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMoreHref && (
            <Link
              href={viewMoreHref}
              className="hidden sm:flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors mr-1 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          <button
            onClick={() => scroll("left")}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div ref={scrollRef} className="scroll-container pb-3">
        {anime.map((a, i) => (
          <AnimeCard key={a.id} anime={a} rank={showRank ? i + 1 : undefined} />
        ))}
      </div>

      {viewMoreHref && (
        <div className="flex sm:hidden justify-center mt-3">
          <Link href={viewMoreHref} className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
