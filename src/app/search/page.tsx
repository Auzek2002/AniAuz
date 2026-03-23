"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, Loader2, SlidersHorizontal, X } from "lucide-react";
import { AniListAnime } from "@/types";
import AnimeCard from "@/components/AnimeCard";
import { Suspense } from "react";

const FORMATS = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"];
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const YEARS = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());
const SORT_OPTIONS = [
  { label: "Trending", value: "trending" },
  { label: "Popular", value: "popular" },
  { label: "Top Rated", value: "toprated" },
  { label: "This Season", value: "seasonal" },
  { label: "Newest", value: "newest" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qParam = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") || "";

  const [query, setQuery] = useState(qParam);
  const [results, setResults] = useState<AniListAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const fetchAnime = async (q: string, sort: string) => {
    setLoading(true);
    try {
      let url = "";
      if (q.trim()) {
        url = `/api/search?q=${encodeURIComponent(q)}&perPage=40`;
      } else if (sort === "trending") {
        url = `/api/trending?perPage=40`;
      } else if (sort === "popular") {
        url = `/api/popular?perPage=40`;
      } else if (sort === "toprated") {
        url = `/api/toprated?perPage=40`;
      } else if (sort === "seasonal") {
        url = `/api/seasonal?perPage=40`;
      } else {
        url = `/api/trending?perPage=40`;
      }
      const res = await fetch(url);
      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      // Client-side filters
      if (selectedGenre) data = data.filter((a: AniListAnime) => a.genres?.includes(selectedGenre));
      if (selectedFormat) data = data.filter((a: AniListAnime) => a.format === selectedFormat);
      if (selectedYear) data = data.filter((a: AniListAnime) => String(a.seasonYear) === selectedYear);

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
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const applyFilters = () => {
    fetchAnime(qParam, sortParam);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSelectedGenre("");
    setSelectedFormat("");
    setSelectedYear("");
    fetchAnime(qParam, sortParam);
  };

  const sortLabel = SORT_OPTIONS.find(s => s.value === sortParam)?.label;
  const pageTitle = qParam ? `Search: "${qParam}"` : sortLabel || "Browse Anime";

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            {results.length > 0 && !loading && (
              <p className="text-sm text-gray-400 mt-1">{results.length} results</p>
            )}
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => router.push(`/search?sort=${opt.value}`)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${sortParam === opt.value ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search anime by title..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all text-sm font-medium">
            Search
          </button>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-xl transition-all border ${showFilters ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</h3>
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X className="w-3 h-3" />Clear</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Genre</label>
                <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                  <option value="">All Genres</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Format</label>
                <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                  <option value="">All Formats</option>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                  <option value="">All Years</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button onClick={applyFilters} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-all">
              Apply Filters
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-gray-400 text-sm">Loading anime...</p>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((a, i) => (
              <AnimeCard key={a.id} anime={a} rank={sortParam && !qParam ? i + 1 : undefined} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Search className="w-12 h-12 text-gray-600" />
            <p className="text-gray-400 text-center">No results found. Try a different search.</p>
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
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
