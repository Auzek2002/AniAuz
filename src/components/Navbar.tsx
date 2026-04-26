"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Menu, X, ChevronRight, Flame, TrendingUp, Star, Sparkles, Layers } from "lucide-react";
import { AniListAnime } from "@/types";
import Image from "next/image";

const GENRES = [
  "Action","Adventure","Comedy","Drama","Fantasy",
  "Horror","Mystery","Romance","Sci-Fi","Slice of Life",
  "Sports","Supernatural","Thriller",
];

const NAV_LINKS = [
  { label: "Home",      href: "/",                     icon: null },
  { label: "Trending",  href: "/search?sort=trending",  icon: Flame },
  { label: "Popular",   href: "/search?sort=popular",   icon: TrendingUp },
  { label: "Top Rated", href: "/search?sort=toprated",  icon: Star },
  { label: "Seasonal",  href: "/search?sort=seasonal",  icon: Sparkles },
];

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<AniListAnime[]>([]);
  const searchRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const mInputRef  = useRef<HTMLInputElement>(null);
  const router     = useRouter();
  const pathname   = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&perPage=6`);
        const d = await r.json();
        setResults(Array.isArray(d) ? d : []);
      } catch { setResults([]); }
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setResults([]);
      setSearchOpen(false);
      setMenuOpen(false);
    }
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]) && href !== "/";

  return (
    <>
      {/* Purple accent top bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500" />

      {/* Main navbar */}
      <nav className={`fixed top-[2px] left-0 right-0 z-40 transition-all duration-300 ${
        scrolled || menuOpen ? "glass shadow-xl shadow-black/40" : "bg-gradient-to-b from-black/70 to-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3" style={{ height: "62px" }}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 mr-2">
              <Image src="/AniAuz_Logo.png" alt="AniAuz" width={46} height={46} className="rounded-xl shadow-lg shadow-violet-900/50 transition-all duration-200 group-hover:shadow-violet-500/60 group-hover:scale-105" />
              <span className="text-xl font-bold gradient-text tracking-tight">AniAuz</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 flex-1">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive(href)
                      ? "text-white bg-white/10"
                      : "text-gray-400 hover:text-white hover:bg-white/6"
                  }`}
                >
                  {label}
                  {isActive(href) && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                  )}
                </Link>
              ))}

              {/* Genres dropdown */}
              <div className="relative group ml-1">
                <button className="px-3.5 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/6 rounded-xl transition-all flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Genres
                </button>
                <div className="absolute top-full left-0 mt-2 w-56 glass rounded-2xl shadow-2xl shadow-black/70 p-2.5 grid grid-cols-2 gap-0.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                  {GENRES.map(g => (
                    <Link
                      key={g}
                      href={`/genre/${encodeURIComponent(g)}`}
                      className="text-xs text-gray-300 hover:text-white hover:bg-violet-600/20 px-2.5 py-1.5 rounded-lg transition-all truncate"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop search */}
            <div ref={searchRef} className="hidden md:block relative ml-auto">
              {searchOpen ? (
                <form onSubmit={submit} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search anime…"
                      className="w-56 lg:w-72 bg-white/8 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/70 focus:bg-white/10 transition-all"
                      autoFocus
                    />
                  </div>
                  <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); setResults([]); }} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/6 rounded-xl transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Search dropdown */}
              {results.length > 0 && searchOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 glass rounded-2xl shadow-2xl shadow-black/70 overflow-hidden anim-scale-in">
                  <div className="divide-y divide-white/5">
                    {results.map(anime => (
                      <Link key={anime.id} href={`/anime/${anime.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors group">
                        <div className="relative w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                          {(anime.coverImage?.medium || anime.coverImage?.large) && (
                            <Image src={anime.coverImage.medium || anime.coverImage.large || ""} alt="" fill className="object-cover" sizes="36px" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate group-hover:text-violet-300 transition-colors">{anime.title?.english || anime.title?.romaji}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{anime.format}{anime.seasonYear ? ` · ${anime.seasonYear}` : ""}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                  <Link href={`/search?q=${encodeURIComponent(query)}`} className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-violet-400 hover:text-violet-300 hover:bg-white/5 border-t border-white/5 transition-colors">
                    View all results <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile icons */}
            <div className="flex items-center gap-1 md:hidden ml-auto">
              <button
                onClick={() => { setMenuOpen(true); setTimeout(() => mInputRef.current?.focus(), 150); }}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50 backdrop-overlay anim-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#09091e] flex flex-col shadow-2xl anim-slide-right">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
                <Image src="/AniAuz_Logo.png" alt="AniAuz" width={40} height={40} className="rounded-xl shadow-md shadow-violet-900/40" />
                <span className="text-lg font-bold gradient-text">AniAuz</span>
              </Link>
              <button onClick={() => setMenuOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-4 border-b border-white/5 flex-shrink-0">
              <form onSubmit={submit}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    ref={mInputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search anime…"
                    className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-all"
                  />
                </div>
                {results.length > 0 && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                    {results.slice(0, 4).map(anime => (
                      <Link key={anime.id} href={`/anime/${anime.id}`} className="flex items-center gap-3 px-3 py-2.5 bg-white/3 hover:bg-white/8 transition-colors" onClick={() => setMenuOpen(false)}>
                        <div className="relative w-8 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                          {(anime.coverImage?.medium || anime.coverImage?.large) && (
                            <Image src={anime.coverImage.medium || anime.coverImage.large || ""} alt="" fill className="object-cover" sizes="32px" />
                          )}
                        </div>
                        <p className="text-sm text-white truncate">{anime.title?.english || anime.title?.romaji}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto pb-8">
              {/* Nav links */}
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                      isActive(href)
                        ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 opacity-60" />}
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-25" />
                  </Link>
                ))}
              </div>

              {/* Genres */}
              <div className="px-4 pt-2 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">Browse by Genre</p>
                <div className="grid grid-cols-3 gap-2">
                  {GENRES.map(g => (
                    <Link
                      key={g}
                      href={`/genre/${encodeURIComponent(g)}`}
                      onClick={() => setMenuOpen(false)}
                      className="text-xs text-gray-300 hover:text-violet-300 bg-white/4 hover:bg-violet-600/15 border border-white/5 hover:border-violet-500/20 px-2 py-2.5 rounded-xl transition-all text-center font-medium leading-tight"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
