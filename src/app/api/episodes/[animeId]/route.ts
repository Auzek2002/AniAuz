import { NextResponse } from "next/server";
import { HiAnime } from "aniwatch";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const decodedId = decodeURIComponent(animeId);
  try {
    const hianime = new HiAnime.Scraper();
    const [info, episodesData] = await Promise.all([
      hianime.getInfo(decodedId),
      hianime.getEpisodes(decodedId),
    ]);
    return NextResponse.json({
      ...info,
      episodes: episodesData.episodes,
      totalEpisodes: episodesData.totalEpisodes,
    });
  } catch (error) {
    console.error("Episodes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
