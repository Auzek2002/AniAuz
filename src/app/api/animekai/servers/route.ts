import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const epId = searchParams.get("epId") || "";
  if (!epId.trim()) return NextResponse.json({ error: "Episode ID required" }, { status: 400 });

  try {
    const animekai = new ANIME.AnimeKai();
    const servers = await animekai.fetchEpisodeServers(epId);
    return NextResponse.json(servers);
  } catch (err) {
    console.error("AnimeKai servers error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 });
  }
}
