"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Play } from "lucide-react";
import { AniListAnime } from "@/types";

interface AnimeCardProps {
  anime: AniListAnime;
  rank?: number;
}

const STATUS_COLORS: Record<string, string> = {
  RELEASING: "bg-green-500",
  FINISHED: "bg-blue-500",
  NOT_YET_RELEASED: "bg-yellow-500",
  CANCELLED: "bg-red-500",
  HIATUS: "bg-orange-500",
};

export default function AnimeCard({ anime, rank }: AnimeCardProps) {
  const title = anime.title?.english || anime.title?.romaji || "Unknown";
  const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || "";

  return (
    <Link href={`/anime/${anime.id}`} className="anime-card group relative flex-shrink-0 w-40 sm:w-44">
      {/* Cover Image */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#111127] card-glow transition-all duration-300">
        {cover && (
          <Image
            src={cover}
            alt={title}
            fill
            className="anime-img object-cover"
            sizes="(max-width: 640px) 160px, 176px"
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg shadow-purple-900/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {rank && (
            <span className="text-xs font-bold text-white bg-purple-600 px-1.5 py-0.5 rounded">
              #{rank}
            </span>
          )}
          {anime.status && (
            <span className={`text-[10px] font-semibold text-white px-1.5 py-0.5 rounded ml-auto ${STATUS_COLORS[anime.status] || "bg-gray-500"}`}>
              {anime.status === "RELEASING" ? "Airing" : anime.status === "FINISHED" ? "Done" : anime.status.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Score badge */}
        {anime.averageScore && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded-md px-1.5 py-0.5 backdrop-blur-sm">
            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold text-white">{(anime.averageScore / 10).toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 space-y-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-gray-100 line-clamp-2 leading-tight group-hover:text-purple-300 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          {anime.format && <span>{anime.format.replace(/_/g, " ")}</span>}
          {anime.episodes && <><span>•</span><span>{anime.episodes} eps</span></>}
          {anime.seasonYear && <><span>•</span><span>{anime.seasonYear}</span></>}
        </div>
      </div>
    </Link>
  );
}
