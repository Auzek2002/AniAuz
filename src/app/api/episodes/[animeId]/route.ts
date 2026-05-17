import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(_: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const slug = decodeURIComponent(animeId);

  try {
    // Fetch the first episode page — it lists all episodes in the sidebar
    const res = await fetch(`https://anineko.to/watch/${slug}/ep-1`, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://anineko.to/",
      },
    });
    if (!res.ok) throw new Error(`episode page returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const epNums = new Set<number>();

    // Collect ep numbers from links like /watch/{slug}/ep-N
    $(`a[href*='/watch/${slug}/ep-']`).each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/ep-(\d+)(?:[/?#]|$)/);
      if (m) epNums.add(parseInt(m[1], 10));
    });

    // Broader fallback: any /ep-N link on the page
    if (epNums.size === 0) {
      $("a[href*='/ep-']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const m = href.match(/\/ep-(\d+)(?:[/?#]|$)/);
        if (m) epNums.add(parseInt(m[1], 10));
      });
    }

    // Try __NEXT_DATA__ for episode list
    if (epNums.size === 0) {
      try {
        const raw = $("#__NEXT_DATA__").html() || "";
        if (raw) {
          const json = JSON.parse(raw);
          const eps: unknown[] =
            json?.props?.pageProps?.episodes ||
            json?.props?.pageProps?.anime?.episodes ||
            json?.props?.pageProps?.episodeList ||
            [];
          if (Array.isArray(eps)) {
            eps.forEach((e: unknown) => {
              const num =
                (e as Record<string, unknown>)?.number ||
                (e as Record<string, unknown>)?.ep ||
                (e as Record<string, unknown>)?.episode_number;
              if (typeof num === "number") epNums.add(num);
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (epNums.size === 0) throw new Error("No episodes found");

    const maxEp = Math.max(...epNums);
    const episodes = Array.from({ length: maxEp }, (_, i) => ({
      episodeId: `${slug}|${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));

    return NextResponse.json({ episodes, totalEpisodes: maxEp });
  } catch (error) {
    console.error("anineko episodes error:", (error as Error).message);
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
