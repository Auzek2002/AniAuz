"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ChevronLeft } from "lucide-react";
import { AniListAnime } from "@/types";
import AnimeCard from "@/components/AnimeCard";
import Link from "next/link";

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const decodedGenre = decodeURIComponent(genre || "");

  const [anime,       setAnime]       = useState<AniListAnime[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [total,       setTotal]       = useState<number | null>(null);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const res  = await fetch(`/api/genre/${encodeURIComponent(decodedGenre)}?page=${p}&perPage=50`);
      const data = await res.json();
      if (replace) setAnime(data.media || []);
      else setAnime(prev => [...prev, ...(data.media || [])]);
      setHasNextPage(data.hasNextPage ?? false);
      setTotal(data.total ?? null);
    } catch {
      setHasNextPage(false);
    } finally {
      if (replace) setLoading(false); else setLoadingMore(false);
    }
  }, [decodedGenre]);

  useEffect(() => {
    setPage(1); setAnime([]); setHasNextPage(true); setTotal(null);
    fetchPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedGenre]);

  const loadMore = () => { const next = page + 1; setPage(next); fetchPage(next, false); };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Header */}
        <div className="pt-4 space-y-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black">
              <span className="gradient-text">{decodedGenre}</span>
              <span className="text-white"> Anime</span>
            </h1>
            {total !== null && (
              <p className="text-sm text-gray-500 mt-1">
                {anime.length.toLocaleString()} of {total.toLocaleString()} titles
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Loading {decodedGenre} anime…</p>
            </div>
          </div>
        ) : anime.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-gray-400">No anime found for this genre.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {anime.map(a => <AnimeCard key={a.id} anime={a} />)}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-white/6 hover:bg-white/10 border border-white/8 hover:border-white/14 disabled:opacity-50 text-white rounded-2xl text-sm font-semibold transition-all"
                >
                  {loadingMore
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                    : "Load More"
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
