import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("ep");

  if (!episodeId) {
    return NextResponse.json({ error: "Episode ID required" }, { status: 400 });
  }

  try {
    const animekai = new ANIME.AnimeKai();
    const data = await animekai.fetchEpisodeSources(episodeId);
    if (!data?.sources?.length) {
      return NextResponse.json(
        { error: "No stream sources found" },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = (err as Error).message?.slice(0, 300) || "unknown";
    console.error("AnimeKai stream error:", msg);
    return NextResponse.json(
      { error: "Failed to fetch stream", detail: msg },
      { status: 500 },
    );
  }
}
