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

  const [anime, setAnime] = useState<AniListAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/genre/${encodeURIComponent(decodedGenre)}?page=${p}&perPage=50`);
      const data = await res.json();
      if (replace) {
        setAnime(data.media || []);
      } else {
        setAnime(prev => [...prev, ...(data.media || [])]);
      }
      setHasNextPage(data.hasNextPage ?? false);
      setTotal(data.total ?? null);
    } catch {
      setHasNextPage(false);
    } finally {
      if (replace) setLoading(false); else setLoadingMore(false);
    }
  }, [decodedGenre]);

  useEffect(() => {
    setPage(1);
    setAnime([]);
    setHasNextPage(true);
    setTotal(null);
    fetchPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedGenre]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors w-fit mb-3">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-white">
            <span className="gradient-text">{decodedGenre}</span> Anime
          </h1>
          {total !== null && (
            <p className="text-sm text-gray-400 mt-1">
              Showing {anime.length} of {total.toLocaleString()} anime
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
        ) : anime.length === 0 ? (
          <div className="text-center py-24 text-gray-400">No anime found for this genre.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anime.map(a => <AnimeCard key={a.id} anime={a} />)}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all"
                >
                  {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
