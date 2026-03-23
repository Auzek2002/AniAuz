import { NextResponse } from "next/server";
import { getAnimeByGenre } from "@/lib/anilist";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ genre: string }> },
) {
  const { genre } = await params;
  const decodedGenre = decodeURIComponent(genre);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = Math.min(parseInt(searchParams.get("perPage") || "50"), 50);

  try {
    const result = await getAnimeByGenre(decodedGenre, page, perPage);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Genre fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch genre" }, { status: 500 });
  }
}
