import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const maxDuration = 30;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Episode ID format: "{slug}|{episodeNumber}", e.g. "attack-on-titan|1"
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ep = searchParams.get("ep") || "";

  if (!ep) {
    return NextResponse.json({ error: "ep param required" }, { status: 400 });
  }

  const [slug, epNumStr] = ep.split("|");
  const epNum = parseInt(epNumStr, 10);
  if (!slug || isNaN(epNum)) {
    return NextResponse.json({ error: "Invalid episode id" }, { status: 400 });
  }

  try {
    const epUrl = `https://anitaku.to/${slug}-episode-${epNum}`;
    const res = await fetch(epUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://anitaku.to/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`Episode page returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Collect all data-video embed URLs
    const embedUrls: string[] = [];
    $("[data-video]").each((_, el) => {
      const url = $(el).attr("data-video");
      if (url) embedUrls.push(url);
    });

    if (embedUrls.length === 0) throw new Error("No embed sources found on episode page");

    // Return as iframe sources — player will render these in an iframe
    return NextResponse.json({
      sources: embedUrls.map((url, i) => ({
        url,
        type: "iframe",
        quality: i === 0 ? "Server 1" : i === 1 ? "Server 2" : `Server ${i + 1}`,
        isM3U8: false,
      })),
    });
  } catch (err) {
    const msg = (err as Error).message?.slice(0, 300) || "unknown";
    console.error("Stream error:", msg);
    return NextResponse.json({ error: "Failed to fetch stream", detail: msg }, { status: 500 });
  }
}
