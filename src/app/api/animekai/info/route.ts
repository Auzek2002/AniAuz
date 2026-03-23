import { NextResponse } from "next/server";
import { ANIME } from "@consumet/extensions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id.trim()) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    const animekai = new ANIME.AnimeKai();
    const data = await animekai.fetchAnimeInfo(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("AnimeKai info error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch info" }, { status: 500 });
  }
}
