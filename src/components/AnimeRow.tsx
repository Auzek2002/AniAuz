"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { AniListAnime } from "@/types";
import Link from "next/link";

interface AnimeRowProps {
  title: string;
  anime: AniListAnime[];
  viewMoreHref?: string;
  showRank?: boolean;
}

export default function AnimeRow({ title, anime, viewMoreHref, showRank }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 600;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  if (!anime || anime.length === 0) return null;

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {viewMoreHref && (
            <Link href={viewMoreHref} className="text-xs text-purple-400 hover:text-purple-300 transition-colors mr-2">
              View all
            </Link>
          )}
          <button onClick={() => scroll("left")} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all hidden sm:flex">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll("right")} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all hidden sm:flex">
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
    </section>
  );
}
