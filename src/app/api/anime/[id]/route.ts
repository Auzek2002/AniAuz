import { NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anilist";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await getAnimeById(parseInt(id));
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch anime" }, { status: 500 });
  }
}
