"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Menu, X, Tv2, ChevronDown } from "lucide-react";
import { AniListAnime } from "@/types";
import Image from "next/image";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AniListAnime[]>([]);
  const [searching, setSearching] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  }, [pathname]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&perPage=6`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setResults([]);
      setSearchOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || menuOpen ? "glass shadow-lg shadow-black/30" : "bg-gradient-to-b from-black/70 to-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-shadow">
              <Tv2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AniAuz</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">Home</Link>
            <Link href="/search?sort=trending" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">Trending</Link>
            <Link href="/search?sort=popular" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">Popular</Link>
            <Link href="/search?sort=toprated" className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">Top Rated</Link>

            {/* Genre Dropdown */}
            <div className="relative" onMouseEnter={() => setGenreOpen(true)} onMouseLeave={() => setGenreOpen(false)}>
              <button className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-1">
                Genres <ChevronDown className="w-3 h-3" />
              </button>
              {genreOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 glass rounded-xl shadow-xl shadow-black/50 p-2 grid grid-cols-2 gap-1">
                  {GENRES.map(g => (
                    <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="text-xs text-gray-300 hover:text-white hover:bg-purple-600/20 px-2 py-1.5 rounded-lg transition-all">
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div ref={searchRef} className="relative">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search anime..."
                    className="w-48 sm:w-64 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white/15 transition-all"
                    autoFocus
                  />
                  <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); setResults([]); }} className="p-1.5 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }} className="p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Dropdown results */}
              {results.length > 0 && searchOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 glass rounded-xl shadow-xl shadow-black/50 overflow-hidden">
                  {searching && <div className="px-4 py-2 text-xs text-gray-400">Searching...</div>}
                  {results.map(anime => (
                    <Link key={anime.id} href={`/anime/${anime.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors">
                      <Image src={anime.coverImage?.medium || anime.coverImage?.large || ""} alt={anime.title?.romaji || ""} width={36} height={48} className="rounded object-cover flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm text-white truncate">{anime.title?.english || anime.title?.romaji}</p>
                        <p className="text-xs text-gray-400">{anime.format} • {anime.seasonYear}</p>
                      </div>
                    </Link>
                  ))}
                  <Link href={`/search?q=${encodeURIComponent(query)}`} className="block px-4 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-white/5 text-center border-t border-white/5">
                    View all results
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <Link href="/" className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Home</Link>
            <Link href="/search?sort=trending" className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Trending</Link>
            <Link href="/search?sort=popular" className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Popular</Link>
            <Link href="/search?sort=toprated" className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Top Rated</Link>
            <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">Genres</div>
            <div className="grid grid-cols-3 gap-1 px-3">
              {GENRES.map(g => (
                <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="text-xs text-gray-300 hover:text-white hover:bg-purple-600/20 px-2 py-1.5 rounded-lg transition-all text-center">
                  {g}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
