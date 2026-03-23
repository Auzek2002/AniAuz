import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const animekai = new ANIME.AnimeKai();
    const data = await animekai.search(q);
    return NextResponse.json(data);
  } catch (err) {
    console.error("AnimeKai search error:", (err as Error).message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
