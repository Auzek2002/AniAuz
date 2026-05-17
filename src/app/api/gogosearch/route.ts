import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ animes: [] });

  try {
    const res = await fetch(
      `https://anineko.to/browser?keyword=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://anineko.to/",
        },
      },
    );
    const html = await res.text();
    const $ = cheerio.load(html);

    // Collect best name per slug — image-only anchors have empty text so we
    // keep updating until we find a non-slug name.
    const slugNames = new Map<string, string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/^\/watch\/([a-z0-9][a-z0-9-]*)\/?$/i);
      if (!match) return;
      const slug = match[1];

      const name =
        $(el).attr("title") ||
        $(el).find("h3, h4, [class*='title'], [class*='name']").first().text().trim() ||
        $(el).text().trim();

      const current = slugNames.get(slug) || "";
      // Prefer any real name over a slug-like default
      if (name && name !== slug && name.length > current.length) {
        slugNames.set(slug, name);
      } else if (!current && slug) {
        slugNames.set(slug, slug);
      }
    });

    const animes = Array.from(slugNames.entries()).map(([id, name]) => ({ id, name }));
    return NextResponse.json({ animes });
  } catch (error) {
    console.error("anineko search error:", (error as Error).message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
