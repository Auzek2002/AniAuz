import { AniListAnime } from "@/types";

const ANILIST_API = "https://graphql.anilist.co";

const ANIME_FIELDS = `
  id
  title { romaji english native userPreferred }
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  popularity
  episodes
  duration
  status
  season
  seasonYear
  format
  studios(isMain: true) { nodes { name } }
  tags { name category }
  trailer { id site }
  nextAiringEpisode { episode timeUntilAiring }
  startDate { year month day }
`;

async function anilistFetch(query: string, variables: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "AniList error");
  return data.data;
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<AniListAnime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { page, perPage }) as { Page: { media: AniListAnime[] } };
  return data.Page.media;
}

export async function getPopularAnime(page = 1, perPage = 20): Promise<AniListAnime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { page, perPage }) as { Page: { media: AniListAnime[] } };
  return data.Page.media;
}

export async function getTopRatedAnime(page = 1, perPage = 20): Promise<AniListAnime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false, status: FINISHED) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { page, perPage }) as { Page: { media: AniListAnime[] } };
  return data.Page.media;
}

export async function getSeasonalAnime(page = 1, perPage = 20): Promise<AniListAnime[]> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const season = seasons[Math.floor(month / 3)];
  const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, season: $season, seasonYear: $year) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { page, perPage, season, year }) as { Page: { media: AniListAnime[] } };
  return data.Page.media;
}

export async function searchAnime(searchQuery: string, page = 1, perPage = 20): Promise<AniListAnime[]> {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, isAdult: false) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { search: searchQuery, page, perPage }) as { Page: { media: AniListAnime[] } };
  return data.Page.media;
}

export async function getAnimeById(id: number): Promise<AniListAnime> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FIELDS}
        characters(sort: ROLE, perPage: 12) {
          nodes {
            name { full native }
            image { large }
          }
        }
      }
    }
  `;
  const data = await anilistFetch(query, { id }, ) as { Media: AniListAnime };
  return data.Media;
}

export async function getAnimeByGenre(
  genre: string,
  page = 1,
  perPage = 50,
): Promise<{ media: AniListAnime[]; hasNextPage: boolean; total: number }> {
  const query = `
    query ($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage total }
        media(genre: $genre, type: ANIME, isAdult: false, sort: POPULARITY_DESC) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await anilistFetch(query, { genre, page, perPage }) as {
    Page: { pageInfo: { hasNextPage: boolean; total: number }; media: AniListAnime[] };
  };
  return {
    media: data.Page.media,
    hasNextPage: data.Page.pageInfo.hasNextPage,
    total: data.Page.pageInfo.total,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function anilistFetchNoCache(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const data = await res.json();
  return data.data;
}

export { anilistFetchNoCache };
