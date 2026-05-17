"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play, Star, Calendar, Clock, Tv, Users, ChevronLeft,
  Loader2, AlertCircle, ChevronRight, ChevronDown,
} from "lucide-react";
import { AniListAnime } from "@/types";
import EpisodeList from "@/components/EpisodeList";
import UniversalPlayer from "@/components/UniversalPlayer";

interface Episode { id: string; number: number; title?: string; }

function titleScore(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const na = norm(a); const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const wa = new Set(na.split(" ")); const wb = new Set(nb.split(" "));
  const inter = [...wa].filter(w => wb.has(w)).length;
  return inter / (wa.size + wb.size - inter);
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  RELEASING:        { label: "Currently Airing", cls: "text-emerald-300 bg-emerald-500/12 border-emerald-500/25" },
  FINISHED:         { label: "Finished",          cls: "text-blue-300    bg-blue-500/12    border-blue-500/25"    },
  NOT_YET_RELEASED: { label: "Coming Soon",       cls: "text-amber-300   bg-amber-500/12   border-amber-500/25"   },
  CANCELLED:        { label: "Cancelled",          cls: "text-red-300     bg-red-500/12     border-red-500/25"     },
  HIATUS:           { label: "On Hiatus",          cls: "text-orange-300  bg-orange-500/12  border-orange-500/25"  },
};

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();

  const [anime,           setAnime]           = useState<AniListAnime | null>(null);
  const [loadingAnime,    setLoadingAnime]    = useState(true);
  const [episodes,        setEpisodes]        = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeError,    setEpisodeError]    = useState<string | null>(null);
  const [selected,        setSelected]        = useState<Episode | null>(null);
  const [descExpanded,    setDescExpanded]    = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingAnime(true);
    fetch(`/api/anime/${id}`)
      .then(r => r.json())
      .then(d => setAnime(d))
      .catch(() => {})
      .finally(() => setLoadingAnime(false));
  }, [id]);

  const loadEpisodes = useCallback(async (animeData: AniListAnime) => {
    setLoadingEpisodes(true);
    setEpisodeError(null);
    const english = animeData.title?.english || "";
    const romaji  = animeData.title?.romaji  || "";
    const query   = english || romaji;
    if (!query) { setLoadingEpisodes(false); return; }

    try {
      const search = async (q: string) => {
        const res = await fetch(`/api/gogosearch?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        return (data.animes || []) as Array<{ id: string; name: string }>;
      };

      let results = await search(query);
      if (results.length === 0 && romaji && romaji !== query) results = await search(romaji);

      if (results.length > 0) {
        const variants = [english, romaji].filter(Boolean);
        let best = results[0]; let bestScore = -1;
        for (const r of results) {
          let s = 0;
          for (const v of variants) s = Math.max(s, titleScore(v, r.name));
          if (s > bestScore) { bestScore = s; best = r; }
        }
        if (bestScore >= 0.2) {
          const epRes  = await fetch(`/api/episodes/${encodeURIComponent(best.id)}`);
          const epData = await epRes.json();
          const eps: Episode[] = (epData.episodes || []).map(
            (e: { episodeId: string; number: number; title?: string }) =>
              ({ id: e.episodeId, number: e.number, title: e.title })
          );
          if (eps.length > 0) { setEpisodes(eps); return; }
        }
      }

      // Slug-guess fallback: derive slug directly from title when search fails.
      // "Attack on Titan" → "attack-on-titan", matching anineko.to's slug convention.
      const toSlug = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
      const slugCandidates = [...new Set([toSlug(english), toSlug(romaji)].filter(Boolean))];
      for (const slug of slugCandidates) {
        try {
          const epRes  = await fetch(`/api/episodes/${encodeURIComponent(slug)}`);
          const epData = await epRes.json();
          const eps: Episode[] = (epData.episodes || []).map(
            (e: { episodeId: string; number: number; title?: string }) =>
              ({ id: e.episodeId, number: e.number, title: e.title })
          );
          if (eps.length > 0) { setEpisodes(eps); return; }
        } catch { /* try next candidate */ }
      }

      if (animeData.episodes) {
        setEpisodes(Array.from({ length: animeData.episodes }, (_, i) => ({ id: `unavailable-${i + 1}`, number: i + 1 })));
        setEpisodeError("Could not find this anime on the streaming source.");
      } else {
        setEpisodeError("Could not load episodes.");
      }
    } catch {
      if (animeData.episodes) {
        setEpisodes(Array.from({ length: animeData.episodes }, (_, i) => ({ id: `unavailable-${i + 1}`, number: i + 1 })));
      }
      setEpisodeError("Failed to load episode list.");
    } finally {
      setLoadingEpisodes(false);
    }
  }, []);

  useEffect(() => { if (anime) loadEpisodes(anime); }, [anime, loadEpisodes]);

  const selectEpisode = useCallback((ep: Episode) => {
    setSelected(ep);
    setTimeout(() => document.getElementById("player")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  const currentIdx  = selected ? episodes.findIndex(e => e.id === selected.id) : -1;
  const nextEpisode = useCallback(() => { if (currentIdx < episodes.length - 1) selectEpisode(episodes[currentIdx + 1]); }, [currentIdx, episodes, selectEpisode]);
  const prevEpisode = useCallback(() => { if (currentIdx > 0) selectEpisode(episodes[currentIdx - 1]); }, [currentIdx, episodes, selectEpisode]);

  if (loadingAnime) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Loading anime…</p>
      </div>
    </div>
  );

  if (!anime) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 px-4">
        <AlertCircle className="w-14 h-14 text-red-400/70 mx-auto" />
        <p className="text-gray-300 font-medium">Anime not found.</p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    </div>
  );

  const animeTitle  = anime.title?.english || anime.title?.romaji || "";
  const cover       = anime.coverImage?.extraLarge || anime.coverImage?.large || "";
  const description = anime.description?.replace(/<[^>]*>/g, "") || "";
  const statusCfg   = anime.status ? STATUS_CONFIG[anime.status] : null;

  return (
    <div className="min-h-screen">
      {/* Banner */}
      {anime.bannerImage && (
        <div className="relative h-52 sm:h-72 overflow-hidden">
          <Image src={anime.bannerImage} alt={animeTitle} fill className="object-cover object-top" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-[#06060f]" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Back link */}
        <div className={`${anime.bannerImage ? "-mt-2 pt-3" : "pt-24"} mb-6`}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Info section */}
        <div className="flex gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className={`relative w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/70 ring-1 ring-white/10 ${anime.bannerImage ? "-mt-14 sm:-mt-20 md:-mt-24" : ""}`}>
              {cover && <Image src={cover} alt={animeTitle} fill className="object-cover" sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 176px" priority />}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 sm:space-y-4 min-w-0 pt-1">
            <div>
              <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight">{animeTitle}</h1>
              {anime.title?.native && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{anime.title.native}</p>}
            </div>

            {/* Stat badges */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {anime.averageScore && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold">
                  <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-yellow-400 text-yellow-400" />
                  {(anime.averageScore / 10).toFixed(1)}
                </div>
              )}
              {anime.episodes && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/5 border border-white/8 text-gray-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm">
                  <Tv className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {anime.episodes} eps
                </div>
              )}
              {anime.duration && (
                <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/8 text-gray-300 rounded-xl px-3 py-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5" /> {anime.duration} min
                </div>
              )}
              {anime.seasonYear && (
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/5 border border-white/8 text-gray-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm">
                  <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  {anime.season ? `${anime.season.slice(0,3)} ` : ""}{anime.seasonYear}
                </div>
              )}
              {anime.popularity && (
                <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/8 text-gray-300 rounded-xl px-3 py-1.5 text-sm">
                  <Users className="w-3.5 h-3.5" /> {(anime.popularity / 1000).toFixed(0)}k
                </div>
              )}
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {anime.format && (
                <span className="text-xs bg-violet-600/15 border border-violet-500/25 text-violet-300 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium">
                  {anime.format.replace(/_/g, " ")}
                </span>
              )}
              {statusCfg && (
                <span className={`text-xs border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              )}
              {anime.studios?.nodes?.[0] && (
                <span className="hidden sm:inline text-xs bg-white/5 border border-white/8 text-gray-300 px-2.5 py-1 rounded-full">
                  {anime.studios.nodes[0].name}
                </span>
              )}
            </div>

            {/* Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {anime.genres.map(g => (
                  <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="genre-pill text-xs text-violet-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
                    {g}
                  </Link>
                ))}
              </div>
            )}

            {/* Description — hidden on mobile to save space */}
            {description && (
              <div className="space-y-1.5 hidden sm:block">
                <p className={`text-sm text-gray-300 leading-relaxed ${!descExpanded ? "line-clamp-3" : ""}`}>
                  {description}
                </p>
                {description.length > 180 && (
                  <button
                    onClick={() => setDescExpanded(v => !v)}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    {descExpanded ? "Show less" : "Read more"}
                    <ChevronDown className={`w-3 h-3 transition-transform ${descExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}

            {/* Watch button */}
            {episodes.length > 0 && !selected && (
              <button
                onClick={() => selectEpisode(episodes[0])}
                className="flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-700/40 hover:-translate-y-0.5 text-sm"
              >
                <Play className="w-4 h-4 fill-white" /> Watch Episode 1
              </button>
            )}
          </div>
        </div>

        {/* Description on mobile — shown below the row, above the player */}
        {description && (
          <div className="sm:hidden space-y-1.5 mb-6">
            <p className={`text-sm text-gray-300 leading-relaxed ${!descExpanded ? "line-clamp-3" : ""}`}>
              {description}
            </p>
            {description.length > 180 && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {descExpanded ? "Show less" : "Read more"}
                <ChevronDown className={`w-3 h-3 transition-transform ${descExpanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* Player */}
        {selected && (
          <div id="player" className="mb-8">
            {/* Player header */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Now Playing — Ep {selected.number}
                  {selected.title && selected.title !== `Episode ${selected.number}` ? (
                    <span className="text-gray-400 font-normal"> · {selected.title}</span>
                  ) : null}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevEpisode}
                  disabled={currentIdx <= 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs text-gray-500 font-medium">{currentIdx + 1} / {episodes.length}</span>
                <button
                  onClick={nextEpisode}
                  disabled={currentIdx >= episodes.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <UniversalPlayer
              anilistId={anime.id}
              episodeNumber={selected.number}
              hianimeEpisodeId={selected.id.startsWith("unavailable-") ? undefined : selected.id}
              title={`${animeTitle} — Episode ${selected.number}`}
              onEnded={nextEpisode}
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-8" />

        {/* Episodes section */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span className="section-bar" />
            <h2 className="text-lg font-bold text-white">Episodes</h2>
            {loadingEpisodes && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
          </div>

          {episodeError && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/18 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 leading-relaxed">{episodeError}</p>
            </div>
          )}

          {!loadingEpisodes && episodes.length > 0 && (
            <EpisodeList
              episodes={episodes}
              currentEpisodeId={selected?.id}
              onSelectEpisode={selectEpisode}
              animeTitle={animeTitle}
            />
          )}

          {!loadingEpisodes && episodes.length === 0 && !episodeError && (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Finding episodes…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
