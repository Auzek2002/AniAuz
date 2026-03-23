"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Clock, Tv, Users, ChevronLeft, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { AniListAnime } from "@/types";
import EpisodeList from "@/components/EpisodeList";
import EmbedPlayer from "@/components/EmbedPlayer";

interface Episode { id: string; number: number; title?: string; }

// Jaccard similarity on word sets — finds the best anime title match
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

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();

  const [anime, setAnime]                     = useState<AniListAnime | null>(null);
  const [loadingAnime, setLoadingAnime]       = useState(true);
  const [episodes, setEpisodes]               = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeError, setEpisodeError]       = useState<string | null>(null);

  const [selected, setSelected] = useState<Episode | null>(null);

  // ── Fetch AniList details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoadingAnime(true);
    fetch(`/api/anime/${id}`)
      .then(r => r.json())
      .then(d => setAnime(d))
      .catch(() => {})
      .finally(() => setLoadingAnime(false));
  }, [id]);

  // ── Search HiAnime + load episode list ────────────────────────────────────
  const loadEpisodes = useCallback(async (animeData: AniListAnime) => {
    setLoadingEpisodes(true);
    setEpisodeError(null);

    const english = animeData.title?.english || "";
    const romaji  = animeData.title?.romaji  || "";
    const query   = english || romaji;
    if (!query) { setLoadingEpisodes(false); return; }

    try {
      // Search with primary title; fall back to romaji if too few results
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

      // Fallback: numbered stubs from AniList episode count
      if (animeData.episodes) {
        setEpisodes(Array.from({ length: animeData.episodes }, (_, i) => ({
          id: `unavailable-${i + 1}`, number: i + 1,
        })));
        setEpisodeError("Could not find this anime on the streaming source.");
      } else {
        setEpisodeError("Could not load episodes.");
      }
    } catch {
      if (animeData.episodes) {
        setEpisodes(Array.from({ length: animeData.episodes }, (_, i) => ({
          id: `unavailable-${i + 1}`, number: i + 1,
        })));
      }
      setEpisodeError("Failed to load episode list.");
    } finally {
      setLoadingEpisodes(false);
    }
  }, []);

  useEffect(() => {
    if (anime) loadEpisodes(anime);
  }, [anime, loadEpisodes]);

  // ── Select episode ─────────────────────────────────────────────────────────
  const selectEpisode = useCallback((ep: Episode) => {
    setSelected(ep);
    setTimeout(() => document.getElementById("player")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const currentIdx  = selected ? episodes.findIndex(e => e.id === selected.id) : -1;
  const nextEpisode = useCallback(() => { if (currentIdx < episodes.length - 1) selectEpisode(episodes[currentIdx + 1]); }, [currentIdx, episodes, selectEpisode]);
  const prevEpisode = useCallback(() => { if (currentIdx > 0) selectEpisode(episodes[currentIdx - 1]); }, [currentIdx, episodes, selectEpisode]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loadingAnime) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-gray-400">Loading anime...</p>
      </div>
    </div>
  );

  if (!anime) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-gray-300">Anime not found.</p>
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">Go back home</Link>
      </div>
    </div>
  );

  const animeTitle  = anime.title?.english || anime.title?.romaji || "";
  const cover       = anime.coverImage?.extraLarge || anime.coverImage?.large || "";
  const description = anime.description?.replace(/<[^>]*>/g, "") || "";

  return (
    <div className="min-h-screen pt-16">
      {anime.bannerImage && (
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <Image src={anime.bannerImage} alt={animeTitle} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a14]" />
          <div className="absolute inset-0 bg-[#0a0a14]/30" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="pt-4 mb-6">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Anime info */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="flex-shrink-0">
            <div className="relative w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 mx-auto md:mx-0">
              {cover && <Image src={cover} alt={animeTitle} fill className="object-cover" sizes="192px" />}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{animeTitle}</h1>
              {anime.title?.native && <p className="text-sm text-gray-400 mt-1">{anime.title.native}</p>}
            </div>

            <div className="flex flex-wrap gap-3">
              {anime.averageScore && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-lg px-3 py-1.5 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{(anime.averageScore / 10).toFixed(1)}</span>
                </div>
              )}
              {anime.episodes && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Tv className="w-4 h-4" /><span>{anime.episodes} eps</span>
                </div>
              )}
              {anime.duration && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Clock className="w-4 h-4" /><span>{anime.duration} min</span>
                </div>
              )}
              {anime.seasonYear && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Calendar className="w-4 h-4" /><span>{anime.season} {anime.seasonYear}</span>
                </div>
              )}
              {anime.popularity && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Users className="w-4 h-4" /><span>{(anime.popularity / 1000).toFixed(0)}k fans</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {anime.format && <span className="text-xs bg-purple-600/20 border border-purple-500/30 text-purple-300 px-2 py-1 rounded-full">{anime.format.replace(/_/g, " ")}</span>}
              {anime.status && (
                <span className={`text-xs px-2 py-1 rounded-full ${anime.status === "RELEASING" ? "bg-green-500/20 border border-green-500/30 text-green-300" : "bg-blue-500/20 border border-blue-500/30 text-blue-300"}`}>
                  {anime.status === "RELEASING" ? "Currently Airing" : anime.status.replace(/_/g, " ")}
                </span>
              )}
              {anime.studios?.nodes?.[0] && <span className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">{anime.studios.nodes[0].name}</span>}
            </div>

            {anime.genres && (
              <div className="flex flex-wrap gap-2">
                {anime.genres.map(g => (
                  <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="genre-pill text-xs text-purple-300 px-3 py-1 rounded-full">{g}</Link>
                ))}
              </div>
            )}

            {description && (
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300 leading-relaxed">{description.slice(0, 400)}{description.length > 400 ? "..." : ""}</p>
              </div>
            )}

            {episodes.length > 0 && (
              <button onClick={() => selectEpisode(episodes[0])}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40 w-fit">
                <Play className="w-4 h-4 fill-white" /> Watch Episode 1
              </button>
            )}
          </div>
        </div>

        {/* Player */}
        {selected && (
          <div id="player" className="mb-10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white">
                Now Playing — Episode {selected.number}
                {selected.title && selected.title !== `Episode ${selected.number}` ? `: ${selected.title}` : ""}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={prevEpisode} disabled={currentIdx <= 0}
                  className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                <button onClick={nextEpisode} disabled={currentIdx >= episodes.length - 1}
                  className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
              </div>
            </div>

            <EmbedPlayer
              anilistId={anime.id}
              episodeNumber={selected.number}
              hianimeEpisodeId={selected.id.startsWith("unavailable-") ? undefined : selected.id}
              title={`Episode ${selected.number}${selected.title && selected.title !== `Episode ${selected.number}` ? `: ${selected.title}` : ""}`}
            />
          </div>
        )}

        {/* Episode list */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            Episodes
            {episodes.length > 0 && <span className="text-sm font-normal text-gray-400">({episodes.length})</span>}
            {loadingEpisodes && <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-1" />}
          </h2>

          {episodeError && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300">{episodeError}</p>
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
        </div>
      </div>
    </div>
  );
}
