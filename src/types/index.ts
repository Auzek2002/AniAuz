export interface AnimeTitle {
  romaji: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AnimeCoverImage {
  large?: string;
  medium?: string;
  extraLarge?: string;
  color?: string;
}

export interface AnimeTag {
  name: string;
  category: string;
}

export interface AnimeStudio {
  name: string;
}

export interface AnimeCharacter {
  name: {
    full: string;
    native?: string;
  };
  image?: {
    large?: string;
  };
  role: string;
}

export interface AniListAnime {
  id: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  bannerImage?: string;
  description?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  studios?: { nodes: AnimeStudio[] };
  tags?: AnimeTag[];
  characters?: { nodes: AnimeCharacter[] };
  trailer?: { id?: string; site?: string };
  nextAiringEpisode?: { episode: number; timeUntilAiring: number };
  startDate?: { year?: number; month?: number; day?: number };
}

// HiAnime (aniwatch) episode type
export interface HiAnimeEpisode {
  episodeId: string;
  number: number;
  title?: string;
  isFiller?: boolean;
}

// Generic episode for UI use
export interface ConsumetEpisode {
  id: string;
  number: number;
  title?: string;
  image?: string;
  description?: string;
  isFiller?: boolean;
}

export interface StreamSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  type?: string;
}

export interface StreamSubtitle {
  url: string;
  lang: string;
  default?: boolean;
}

export interface StreamData {
  sources: StreamSource[];
  subtitles?: StreamSubtitle[];
  headers?: Record<string, string>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  anilistID?: number;
  malID?: number;
}

export interface HiAnimeSearchResult {
  id: string;
  name: string;
  jname?: string;
  poster?: string;
  duration?: string;
  type?: string;
  rating?: string;
  episodes?: { sub?: number; dub?: number };
}

export interface ConsumetAnimeInfo {
  id: string;
  title: string;
  url?: string;
  image?: string;
  releaseDate?: string;
  description?: string;
  genres?: string[];
  totalEpisodes?: number;
  episodes: ConsumetEpisode[];
}
