import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const decodedId = decodeURIComponent(animeId);
  try {
    const animekai = new ANIME.AnimeKai();
    const info = await animekai.fetchAnimeInfo(decodedId);
    // Map AnimeKai episodes to the shape the anime page expects:
    // { episodes: [{ episodeId, number, title }] }
    const episodes = (info.episodes || []).map((e) => ({
      episodeId: e.id,
      number: e.number,
      title: e.title || `Episode ${e.number}`,
    }));
    return NextResponse.json({ episodes, totalEpisodes: episodes.length });
  } catch (error) {
    console.error("AnimeKai episodes error:", (error as Error).message);
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
