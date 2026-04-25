import Link from "next/link";
import { Tv2, Github, Twitter, Heart } from "lucide-react";

const GENRES = ["Action","Adventure","Comedy","Drama","Fantasy","Horror","Romance","Sci-Fi","Slice of Life","Sports"];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 relative overflow-hidden">
      {/* Subtle glow behind footer */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-24 bg-violet-600/8 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                <Tv2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">AniAuz</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Your ultimate destination for anime streaming. Watch the latest and greatest for free, anytime.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/10">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Browse</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Trending",   href: "/search?sort=trending" },
                { label: "Popular",    href: "/search?sort=popular" },
                { label: "Top Rated",  href: "/search?sort=toprated" },
                { label: "New Season", href: "/search?sort=seasonal" },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Genres</h3>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2">
              {GENRES.map(g => (
                <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors truncate">
                  {g}
                </Link>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Company</h3>
            <ul className="space-y-2.5">
              {["About Us", "Contact", "Privacy Policy", "Terms of Service", "DMCA"].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} AniAuz. All rights reserved.
          </p>
          <p className="text-xs text-gray-600 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-pink-500 fill-pink-500" /> · Powered by AniList
          </p>
        </div>
      </div>
    </footer>
  );
}
