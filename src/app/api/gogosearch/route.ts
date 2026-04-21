import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ animes: [] });
  try {
    const animekai = new ANIME.AnimeKai();
    const data = await animekai.search(q);
    // Map AnimeKai results to the shape the anime page expects: { animes: [{id, name}] }
    const animes = (data.results || []).map((r) => ({
      id: r.id,
      name: r.title as string,
    }));
    return NextResponse.json({ animes });
  } catch (error) {
    console.error("AnimeKai search error:", (error as Error).message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
