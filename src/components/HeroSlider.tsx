"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, ChevronLeft, ChevronRight, Calendar, Tv } from "lucide-react";
import { AniListAnime } from "@/types";

interface HeroSliderProps {
  anime: AniListAnime[];
}

export default function HeroSlider({ anime }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const slides = anime.slice(0, 8);

  const goTo = useCallback((index: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  if (!slides.length) return null;

  const anime_item = slides[current];
  const title = anime_item.title?.english || anime_item.title?.romaji || "";
  const banner = anime_item.bannerImage || anime_item.coverImage?.extraLarge || anime_item.coverImage?.large || "";
  const description = anime_item.description?.replace(/<[^>]*>/g, "") || "";

  return (
    <div className="relative h-[70vh] min-h-[480px] max-h-[700px] w-full overflow-hidden">
      {/* Background */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? "opacity-0" : "opacity-100"}`}>
        {banner && (
          <Image
            src={banner}
            alt={title}
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        )}
        {/* Overlays */}
        <div className="hero-fade absolute inset-0" />
        <div className="hero-fade-bottom absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className={`absolute inset-0 flex items-center transition-all duration-500 ${transitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-16">
          <div className="max-w-2xl space-y-4">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {anime_item.format && (
                <span className="flex items-center gap-1 text-xs font-medium text-purple-300 bg-purple-600/20 border border-purple-500/30 px-2 py-1 rounded-full">
                  <Tv className="w-3 h-3" />
                  {anime_item.format.replace(/_/g, " ")}
                </span>
              )}
              {anime_item.seasonYear && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-300 bg-white/10 px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {anime_item.season} {anime_item.seasonYear}
                </span>
              )}
              {anime_item.averageScore && (
                <span className="flex items-center gap-1 text-xs font-medium text-yellow-300 bg-yellow-500/20 border border-yellow-500/30 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 fill-yellow-300" />
                  {(anime_item.averageScore / 10).toFixed(1)}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-lg">
              {title}
            </h1>

            {/* Genres */}
            {anime_item.genres && anime_item.genres.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {anime_item.genres.slice(0, 4).map(g => (
                  <span key={g} className="text-xs text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed max-w-lg">
                {description.slice(0, 200)}{description.length > 200 ? "..." : ""}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link href={`/anime/${anime_item.id}`} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50">
                <Play className="w-4 h-4 fill-white" />
                Watch Now
              </Link>
              <Link href={`/anime/${anime_item.id}`} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20 backdrop-blur-sm">
                <Info className="w-4 h-4" />
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all backdrop-blur-sm border border-white/10 hover:border-white/20">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all backdrop-blur-sm border border-white/10 hover:border-white/20">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`transition-all duration-300 rounded-full ${i === current ? "w-6 h-2 bg-purple-500" : "w-2 h-2 bg-white/30 hover:bg-white/50"}`} />
        ))}
      </div>

      {/* Thumbnail strip (small preview) */}
      <div className="absolute bottom-6 right-6 hidden lg:flex gap-2">
        {slides.slice(0, 5).map((a, i) => (
          <button key={a.id} onClick={() => goTo(i)} className={`relative w-14 h-20 rounded-lg overflow-hidden transition-all ${i === current ? "ring-2 ring-purple-500 scale-105" : "opacity-50 hover:opacity-75"}`}>
            <Image src={a.coverImage?.medium || a.coverImage?.large || ""} alt={a.title?.romaji || ""} fill className="object-cover" sizes="56px" />
          </button>
        ))}
      </div>
    </div>
  );
}
