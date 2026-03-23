import Link from "next/link";
import { Tv2, Github, Twitter } from "lucide-react";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Slice of Life", "Sports"];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Tv2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">AniAuz</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your ultimate destination for anime streaming. Watch the latest and greatest anime for free.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Browse</h3>
            <ul className="space-y-2">
              {[
                { label: "Trending", href: "/search?sort=trending" },
                { label: "Popular", href: "/search?sort=popular" },
                { label: "Top Rated", href: "/search?sort=toprated" },
                { label: "New Season", href: "/search?sort=seasonal" },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Genres</h3>
            <div className="grid grid-cols-2 gap-1">
              {GENRES.map(g => (
                <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="text-sm text-gray-400 hover:text-purple-400 transition-colors truncate">
                  {g}
                </Link>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">About</h3>
            <ul className="space-y-2">
              {["About Us", "Contact", "Privacy Policy", "Terms of Service", "DMCA"].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} AniAuz. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Powered by AniList & GogoAnime. For educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
