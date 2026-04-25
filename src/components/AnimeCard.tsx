"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Play, Tv } from "lucide-react";
import { AniListAnime } from "@/types";

interface AnimeCardProps { anime: AniListAnime; rank?: number; }

const STATUS_DOT: Record<string, string> = {
  RELEASING: "bg-emerald-400",
  FINISHED:  "bg-blue-400",
  NOT_YET_RELEASED: "bg-amber-400",
  CANCELLED: "bg-red-400",
  HIATUS:    "bg-orange-400",
};

export default function AnimeCard({ anime, rank }: AnimeCardProps) {
  const title = anime.title?.english || anime.title?.romaji || "Unknown";
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || "";

  return (
    <Link href={`/anime/${anime.id}`} className="anime-card group relative flex-shrink-0 w-[152px] sm:w-[168px]">
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#0d0d1f] card-glow">
        {cover && (
          <Image
            src={cover}
            alt={title}
            fill
            className="anime-img object-cover"
            sizes="(max-width: 640px) 152px, 168px"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
          <div className="w-13 h-13 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-xl shadow-violet-900/60 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
          {anime.episodes && (
            <span className="text-xs text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full">
              {anime.episodes} eps
            </span>
          )}
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
          {rank ? (
            <span className="text-xs font-black text-white bg-gradient-to-r from-violet-600 to-pink-600 px-1.5 py-0.5 rounded-lg shadow-lg">
              #{rank}
            </span>
          ) : (
            <span />
          )}
          {anime.status && STATUS_DOT[anime.status] && (
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[anime.status]} shadow-lg mt-1`} title={anime.status} />
          )}
        </div>

        {/* Score badge */}
        {anime.averageScore && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold text-white">{(anime.averageScore / 10).toFixed(1)}</span>
          </div>
        )}

        {/* Format badge */}
        {anime.format && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-violet-600/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
            <Tv className="w-2.5 h-2.5 text-violet-200" />
            <span className="text-[10px] font-semibold text-violet-100">{anime.format.replace(/_/g, " ")}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-100 line-clamp-2 leading-snug group-hover:text-violet-300 transition-colors duration-200">
          {title}
        </h3>
        {anime.seasonYear && (
          <p className="text-[10px] text-gray-500 font-medium">
            {anime.season ? `${anime.season} ` : ""}{anime.seasonYear}
          </p>
        )}
      </div>
    </Link>
  );
}
