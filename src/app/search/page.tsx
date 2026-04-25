"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Loader2, Flame, TrendingUp, Star, Sparkles, Zap } from "lucide-react";
import { AniListAnime } from "@/types";
import AnimeCard from "@/components/AnimeCard";
import { Suspense } from "react";

const FORMATS = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"];
const GENRES  = ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Mystery","Romance","Sci-Fi","Slice of Life","Sports","Supernatural","Thriller"];
const YEARS   = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());

const SORT_OPTIONS = [
  { label: "Trending",    value: "trending",  icon: Flame },
  { label: "Popular",     value: "popular",   icon: TrendingUp },
  { label: "Top Rated",   value: "toprated",  icon: Star },
  { label: "This Season", value: "seasonal",  icon: Sparkles },
  { label: "Newest",      value: "newest",    icon: Zap },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const qParam       = searchParams.get("q")    || "";
  const sortParam    = searchParams.get("sort") || "";

  const [query,          setQuery]          = useState(qParam);
  const [results,        setResults]        = useState<AniListAnime[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [selectedGenre,  setSelectedGenre]  = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedYear,   setSelectedYear]   = useState("");

  const fetchAnime = async (q: string, sort: string) => {
    setLoading(true);
    try {
      let url = "";
      if (q.trim())           url = `/api/search?q=${encodeURIComponent(q)}&perPage=40`;
      else if (sort === "trending")  url = `/api/trending?perPage=40`;
      else if (sort === "popular")   url = `/api/popular?perPage=40`;
      else if (sort === "toprated")  url = `/api/toprated?perPage=40`;
      else if (sort === "seasonal")  url = `/api/seasonal?perPage=40`;
      else                           url = `/api/trending?perPage=40`;

      const res  = await fetch(url);
      let data   = await res.json();
      if (!Array.isArray(data)) data = [];

      if (selectedGenre)  data = data.filter((a: AniListAnime) => a.genres?.includes(selectedGenre));
      if (selectedFormat) data = data.filter((a: AniListAnime) => a.format === selectedFormat);
      if (selectedYear)   data = data.filter((a: AniListAnime) => String(a.seasonYear) === selectedYear);

      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAnime(qParam, sortParam);
    setQuery(qParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, sortParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const applyFilters = () => { fetchAnime(qParam, sortParam); setShowFilters(false); };
  const clearFilters = () => {
    setSelectedGenre(""); setSelectedFormat(""); setSelectedYear("");
    fetchAnime(qParam, sortParam);
  };

  const hasActiveFilters = selectedGenre || selectedFormat || selectedYear;
  const pageTitle = qParam ? `Results for "${qParam}"` : SORT_OPTIONS.find(s => s.value === sortParam)?.label || "Browse Anime";

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Page header */}
        <div className="pt-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white">{pageTitle}</h1>
          {results.length > 0 && !loading && (
            <p className="text-sm text-gray-500 mt-1">{results.length} results found</p>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search anime by title…"
              className="w-full bg-white/5 border border-white/8 hover:border-white/12 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white rounded-2xl transition-all text-sm font-semibold shadow-lg shadow-violet-900/30"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`relative px-3.5 py-3 rounded-2xl transition-all border ${
              showFilters || hasActiveFilters
                ? "bg-violet-600/15 border-violet-500/35 text-violet-300"
                : "bg-white/5 border-white/8 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full" />
            )}
          </button>
        </form>

        {/* Sort tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {SORT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = sortParam === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => router.push(`/search?sort=${opt.value}`)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                  active
                    ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Filters</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Genre",  value: selectedGenre,  set: setSelectedGenre,  opts: GENRES },
                { label: "Format", value: selectedFormat, set: setSelectedFormat, opts: FORMATS },
                { label: "Year",   value: selectedYear,   set: setSelectedYear,   opts: YEARS  },
              ].map(({ label, value, set, opts }) => (
                <div key={label}>
                  <label className="text-xs text-gray-500 mb-2 block font-medium uppercase tracking-wide">{label}</label>
                  <select
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 text-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/60 transition-all appearance-none"
                  >
                    <option value="">All {label}s</option>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={applyFilters}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Loading anime…</p>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {results.map((a, i) => (
              <AnimeCard key={a.id} anime={a} rank={sortParam && !qParam ? i + 1 : undefined} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Search className="w-7 h-7 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">No results found</p>
              <p className="text-gray-500 text-sm mt-1">Try a different search term or browse by genre</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
