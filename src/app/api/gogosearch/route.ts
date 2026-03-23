import { NextResponse } from "next/server";
import { HiAnime } from "aniwatch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ animes: [] });
  try {
    const hianime = new HiAnime.Scraper();
    const results = await hianime.search(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
