import { getTrendingAnime, getPopularAnime, getTopRatedAnime, getSeasonalAnime } from "@/lib/anilist";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import { Flame, TrendingUp, Star, Sparkles } from "lucide-react";
import Link from "next/link";

export const revalidate = 3600;

const GENRE_CARDS = [
  { name: "Action",       emoji: "⚔️",  from: "from-red-500/15",    to: "to-orange-500/10",   border: "border-red-500/20",    hover: "hover:border-red-400/40    hover:from-red-500/22"    },
  { name: "Romance",      emoji: "💖",  from: "from-pink-500/15",   to: "to-rose-500/10",     border: "border-pink-500/20",   hover: "hover:border-pink-400/40   hover:from-pink-500/22"   },
  { name: "Fantasy",      emoji: "✨",  from: "from-violet-500/15", to: "to-purple-500/10",   border: "border-violet-500/20", hover: "hover:border-violet-400/40 hover:from-violet-500/22" },
  { name: "Sci-Fi",       emoji: "🚀",  from: "from-blue-500/15",   to: "to-cyan-500/10",     border: "border-blue-500/20",   hover: "hover:border-blue-400/40   hover:from-blue-500/22"   },
  { name: "Comedy",       emoji: "😂",  from: "from-amber-500/15",  to: "to-yellow-500/10",   border: "border-amber-500/20",  hover: "hover:border-amber-400/40  hover:from-amber-500/22"  },
  { name: "Horror",       emoji: "💀",  from: "from-gray-500/15",   to: "to-zinc-700/10",     border: "border-gray-500/20",   hover: "hover:border-gray-400/40   hover:from-gray-500/22"   },
  { name: "Adventure",    emoji: "🗺️", from: "from-emerald-500/15",to: "to-teal-500/10",     border: "border-emerald-500/20",hover: "hover:border-emerald-400/40 hover:from-emerald-500/22"},
  { name: "Drama",        emoji: "🎭",  from: "from-indigo-500/15", to: "to-blue-500/10",     border: "border-indigo-500/20", hover: "hover:border-indigo-400/40 hover:from-indigo-500/22" },
  { name: "Sports",       emoji: "🏆",  from: "from-orange-500/15", to: "to-amber-500/10",    border: "border-orange-500/20", hover: "hover:border-orange-400/40 hover:from-orange-500/22" },
  { name: "Slice of Life",emoji: "🌸",  from: "from-teal-500/15",   to: "to-cyan-500/10",     border: "border-teal-500/20",   hover: "hover:border-teal-400/40   hover:from-teal-500/22"   },
];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* Trending */}
        <AnimeRow
          title="Trending Now"
          badge="This Week"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          anime={trending}
          viewMoreHref="/search?sort=trending"
          showRank
        />

        {/* Seasonal */}
        <AnimeRow
          title="This Season"
          badge="New Episodes"
          icon={<Sparkles className="w-5 h-5 text-sky-400" />}
          anime={seasonal}
          viewMoreHref="/search?sort=seasonal"
        />

        {/* Genre grid */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="section-bar" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Browse by Genre</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {GENRE_CARDS.map(g => (
              <Link
                key={g.name}
                href={`/genre/${encodeURIComponent(g.name)}`}
                className={`bg-gradient-to-br ${g.from} ${g.to} border ${g.border} ${g.hover} rounded-2xl px-4 py-4 flex items-center gap-3 transition-all duration-200 hover:scale-[1.03] hover:-translate-y-0.5 group`}
              >
                <span className="text-2xl leading-none">{g.emoji}</span>
                <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors leading-tight">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular */}
        <AnimeRow
          title="Most Popular"
          badge="All Time"
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
          anime={popular}
          viewMoreHref="/search?sort=popular"
        />

        {/* Top Rated */}
        <AnimeRow
          title="Top Rated"
          badge="Highest Scores"
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          anime={topRated}
          viewMoreHref="/search?sort=toprated"
          showRank
        />
      </div>
    </div>
  );
}
