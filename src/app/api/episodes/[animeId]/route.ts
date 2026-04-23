import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(_: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const slug = decodeURIComponent(animeId);

  try {
    const res = await fetch(`https://anitaku.to/category/${slug}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`category page returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Parse episode ranges from the pagination, e.g. "001-025", "026-050"
    let maxEp = 0;
    $("#episode_page li a").each((_, el) => {
      const val = $(el).attr("data-value") || "";
      const parts = val.split("-");
      const end = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(end) && end > maxEp) maxEp = end;
    });

    // Fall back to counting direct episode links if pagination is absent
    if (maxEp === 0) {
      $("a[href*='-episode-']").each((_, el) => {
        const m = ($(el).attr("href") || "").match(/-episode-(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxEp) maxEp = n;
        }
      });
    }

    if (maxEp === 0) throw new Error("Could not determine episode count");

    const episodes = Array.from({ length: maxEp }, (_, i) => ({
      episodeId: `${slug}|${i + 1}`,
      number: i + 1,
      title: `Episode ${i + 1}`,
    }));

    return NextResponse.json({ episodes, totalEpisodes: maxEp });
  } catch (error) {
    console.error("anitaku episodes error:", (error as Error).message);
    return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
