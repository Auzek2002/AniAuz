import { NextResponse } from "next/server";
import { searchAnime } from "@/lib/anilist";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "20");
  if (!q.trim()) return NextResponse.json([]);
  try {
    const data = await searchAnime(q, page, perPage);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to search anime" }, { status: 500 });
  }
}
