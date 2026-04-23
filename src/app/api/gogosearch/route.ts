import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ animes: [] });

  try {
    const res = await fetch(
      `https://anitaku.to/search.html?keyword=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": UA } },
    );
    const html = await res.text();
    const $ = cheerio.load(html);

    const animes: { id: string; name: string }[] = [];
    $(".items .img a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const slug = href.replace("/category/", "").replace(/\/$/, "");
      const name = $(el).attr("title") || $(el).find("img").attr("alt") || slug;
      if (slug) animes.push({ id: slug, name });
    });

    return NextResponse.json({ animes });
  } catch (error) {
    console.error("anitaku search error:", (error as Error).message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
