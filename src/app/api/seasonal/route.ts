import { NextResponse } from "next/server";
import { getSeasonalAnime } from "@/lib/anilist";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  try {
    const data = await getSeasonalAnime(page, perPage);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch seasonal anime" }, { status: 500 });
  }
}
