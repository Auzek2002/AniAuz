import { getTrendingAnime, getPopularAnime, getTopRatedAnime, getSeasonalAnime } from "@/lib/anilist";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import { Flame, TrendingUp, Star, Sparkles } from "lucide-react";
import Link from "next/link";

export const revalidate = 3600;

export default async function HomePage() {
  const [trending, popular, topRated, seasonal] = await Promise.all([
    getTrendingAnime(1, 20),
    getPopularAnime(1, 20),
    getTopRatedAnime(1, 20),
    getSeasonalAnime(1, 20),
  ]);

  const heroAnime = trending.filter(a => a.bannerImage).slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <HeroSlider anime={heroAnime.length >= 3 ? heroAnime : trending.slice(0, 8)} />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Trending */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Trending Now</h2>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">This Week</span>
          </div>
          <AnimeRow title="" anime={trending} viewMoreHref="/search?sort=trending" showRank />
        </section>

        {/* Seasonal */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">This Season</h2>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">New Episodes</span>
          </div>
          <AnimeRow title="" anime={seasonal} viewMoreHref="/search?sort=seasonal" />
        </section>

        {/* Popular */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Most Popular</h2>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">All Time</span>
          </div>
          <AnimeRow title="" anime={popular} viewMoreHref="/search?sort=popular" />
        </section>

        {/* Top Rated */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Top Rated</h2>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">Highest Scores</span>
          </div>
          <AnimeRow title="" anime={topRated} viewMoreHref="/search?sort=toprated" showRank />
        </section>

        {/* Genre grid */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { name: "Action", cls: "from-red-600/20 to-orange-600/20 border-red-500/20 hover:border-red-500/40" },
              { name: "Romance", cls: "from-pink-600/20 to-red-600/20 border-pink-500/20 hover:border-pink-500/40" },
              { name: "Fantasy", cls: "from-purple-600/20 to-blue-600/20 border-purple-500/20 hover:border-purple-500/40" },
              { name: "Sci-Fi", cls: "from-blue-600/20 to-cyan-600/20 border-blue-500/20 hover:border-blue-500/40" },
              { name: "Comedy", cls: "from-yellow-600/20 to-orange-600/20 border-yellow-500/20 hover:border-yellow-500/40" },
              { name: "Horror", cls: "from-gray-700/30 to-red-900/20 border-gray-600/20 hover:border-red-500/40" },
              { name: "Adventure", cls: "from-green-600/20 to-teal-600/20 border-green-500/20 hover:border-green-500/40" },
              { name: "Drama", cls: "from-indigo-600/20 to-purple-600/20 border-indigo-500/20 hover:border-indigo-500/40" },
              { name: "Sports", cls: "from-orange-600/20 to-yellow-600/20 border-orange-500/20 hover:border-orange-500/40" },
              { name: "Slice of Life", cls: "from-teal-600/20 to-green-600/20 border-teal-500/20 hover:border-teal-500/40" },
            ].map(g => (
              <Link key={g.name} href={`/genre/${encodeURIComponent(g.name)}`}
                className={`bg-gradient-to-br ${g.cls} border rounded-xl px-4 py-3 text-center text-sm font-medium text-gray-200 hover:text-white transition-all duration-200 hover:scale-105`}>
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
