"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, ChevronLeft, ChevronRight, Calendar, Tv } from "lucide-react";
import { AniListAnime } from "@/types";

interface HeroSliderProps { anime: AniListAnime[]; }

export default function HeroSlider({ anime }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [fading,  setFading]  = useState(false);
  const touchX    = useRef<number | null>(null);
  const slides = anime.slice(0, 8);

  const goTo = useCallback((idx: number) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 350);
  }, [fading]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) { diff > 0 ? next() : prev(); }
    touchX.current = null;
  };

  useEffect(() => {
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next]);

  if (!slides.length) return null;

  const item  = slides[current];
  const title = item.title?.english || item.title?.romaji || "";
  const banner = item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large || "";
  const cover  = item.coverImage?.extraLarge || item.coverImage?.large || "";
  const desc   = item.description?.replace(/<[^>]*>/g, "") || "";

  return (
    <div
      className="relative w-full overflow-hidden h-[460px] sm:h-[540px] lg:h-[680px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      {/* Background image */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
        {banner && (
          <Image src={banner} alt={title} fill className="object-cover object-top" priority sizes="100vw" />
        )}
        {/* Mobile: stronger dark overlay so text is readable */}
        <div className="absolute inset-0 bg-black/55 sm:bg-transparent" />
        <div className="hero-fade absolute inset-0 hidden sm:block" />
        <div className="hero-fade-bottom absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className={`absolute inset-0 flex items-end sm:items-center transition-all duration-500 ${fading ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-16 pb-20 sm:pb-16">
          <div className="flex items-center gap-8 lg:gap-12">

            {/* Cover card — hidden on mobile */}
            <div className="hidden md:block flex-shrink-0">
              <div className="relative w-36 lg:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black ring-1 ring-white/10">
                {cover && <Image src={cover} alt={title} fill className="object-cover" sizes="176px" />}
              </div>
            </div>

            {/* Text */}
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {item.status === "RELEASING" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Airing
                  </span>
                )}
                {item.format && (
                  <span className="flex items-center gap-1 text-xs font-medium text-violet-300 bg-violet-600/15 border border-violet-500/25 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    <Tv className="w-3 h-3" />
                    {item.format.replace(/_/g, " ")}
                  </span>
                )}
                {item.seasonYear && (
                  <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-300 bg-white/8 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3 h-3" />
                    {item.season} {item.seasonYear}
                  </span>
                )}
                {item.averageScore && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-yellow-300 bg-yellow-500/15 border border-yellow-500/25 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    <Star className="w-3 h-3 fill-yellow-300" />
                    {(item.averageScore / 10).toFixed(1)}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-[1.6rem] sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] drop-shadow-lg">
                {title}
              </h1>

              {/* Genres — mobile: 2 max, desktop: 4 */}
              {item.genres && item.genres.length > 0 && (
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {item.genres.slice(0, 4).map((g, gi) => (
                    <span key={g} className={`text-xs text-gray-300 bg-white/8 backdrop-blur-sm px-2.5 py-1 rounded-full ${gi >= 2 ? "hidden sm:inline-flex" : ""}`}>{g}</span>
                  ))}
                </div>
              )}

              {/* Description — hidden on mobile */}
              {desc && (
                <p className="hidden sm:block text-sm sm:text-base text-gray-300/90 line-clamp-3 leading-relaxed max-w-xl">
                  {desc.slice(0, 220)}{desc.length > 220 ? "…" : ""}
                </p>
              )}

              {/* CTAs */}
              <div className="flex items-center gap-2 sm:gap-3 pt-0.5">
                <Link
                  href={`/anime/${item.id}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all shadow-lg shadow-violet-900/50 hover:shadow-violet-700/50 hover:-translate-y-0.5 text-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Watch Now
                </Link>
                <Link
                  href={`/anime/${item.id}`}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/16 text-white font-semibold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl transition-all border border-white/12 hover:border-white/20 backdrop-blur-sm hover:-translate-y-0.5 text-sm"
                >
                  <Info className="w-4 h-4" />
                  <span className="hidden xs:inline">Details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav arrows — hidden on mobile (use swipe) */}
      <button onClick={prev} className="hidden sm:flex absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="hidden sm:flex absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:scale-105">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? "w-6 sm:w-7 h-2 bg-gradient-to-r from-violet-500 to-pink-500"
                : "w-2 h-2 bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Thumbnail strip (xl screens only) */}
      <div className="absolute bottom-5 right-6 hidden xl:flex gap-2">
        {slides.slice(0, 5).map((a, i) => (
          <button
            key={a.id}
            onClick={() => goTo(i)}
            className={`relative w-12 h-[68px] rounded-xl overflow-hidden transition-all duration-300 ${
              i === current
                ? "ring-2 ring-violet-500 scale-110 opacity-100"
                : "opacity-40 hover:opacity-70 scale-100"
            }`}
          >
            <Image
              src={a.coverImage?.medium || a.coverImage?.large || ""}
              alt={a.title?.romaji || ""}
              fill
              className="object-cover"
              sizes="48px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
