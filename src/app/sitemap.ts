import { MetadataRoute } from "next";
import { getTrendingAnime, getPopularAnime, getTopRatedAnime } from "@/lib/anilist";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://ani-auz.vercel.app";

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Romance", "Sci-Fi", "Slice of Life", "Sports",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // ── Static pages ───────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                                     lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/search`,                         lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/search?sort=trending`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/search?sort=popular`,            lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE_URL}/search?sort=toprated`,           lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE_URL}/search?sort=seasonal`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },
  ];

  // ── Genre pages ────────────────────────────────────────────────────────────
  const genreRoutes: MetadataRoute.Sitemap = GENRES.map(genre => ({
    url: `${BASE_URL}/genre/${encodeURIComponent(genre)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Anime detail pages — fetch top 50 from 3 lists and deduplicate ─────────
  let animeIds: number[] = [];
  try {
    const [trending, popular, topRated] = await Promise.all([
      getTrendingAnime(1, 50),
      getPopularAnime(1, 50),
      getTopRatedAnime(1, 50),
    ]);
    const seen = new Set<number>();
    for (const anime of [...trending, ...popular, ...topRated]) {
      if (!seen.has(anime.id)) { seen.add(anime.id); animeIds.push(anime.id); }
    }
  } catch {
    // If AniList is unavailable during build, skip anime routes
  }

  const animeRoutes: MetadataRoute.Sitemap = animeIds.map(id => ({
    url: `${BASE_URL}/anime/${id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...genreRoutes, ...animeRoutes];
}
