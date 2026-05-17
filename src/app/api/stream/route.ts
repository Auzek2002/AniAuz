import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const maxDuration = 30;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Episode ID format: "{slug}|{episodeNumber}", e.g. "witch-hat-atelier|1"
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ep = searchParams.get("ep") || "";

  if (!ep) return NextResponse.json({ error: "ep param required" }, { status: 400 });

  const [slug, epNumStr] = ep.split("|");
  const epNum = parseInt(epNumStr, 10);
  if (!slug || isNaN(epNum)) {
    return NextResponse.json({ error: "Invalid episode id" }, { status: 400 });
  }

  const epUrl = `https://anineko.to/watch/${slug}/ep-${epNum}`;

  try {
    const res = await fetch(epUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://anineko.to/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`Episode page returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const sources: Array<{ url: string; type: string; quality: string; isM3U8: boolean }> = [];

    // anineko.to embeds all server iframe URLs in data-video attributes in the static HTML.
    // Buttons: <button class="nv-server-btn server-video server" data-video="https://...">
    // Grouped inside .lang-group[data-id="hsub|sub|dub"] panels.
    $("button.server-video[data-video]").each((_, el) => {
      const url = $(el).attr("data-video") || "";
      if (!url.startsWith("http")) return;

      const $el = $(el);
      const spanText = $el.find("span").text().trim();
      const fullText = $el.text().trim();
      // Strip the span's text (e.g. "Hard Sub") to get just the server label (e.g. "HD-1")
      const serverLabel = fullText.replace(spanText, "").trim() || "Server";

      const panelId = $el.closest(".lang-group").attr("data-id") || "";
      const typeLabel = panelId === "hsub" ? "HSub" : panelId === "sub" ? "Sub" : panelId === "dub" ? "Dub" : "";

      const quality = typeLabel ? `${serverLabel} ${typeLabel}` : serverLabel;
      sources.push({ url, type: "iframe", quality, isM3U8: false });
    });

    if (sources.length > 0) {
      return NextResponse.json({ sources });
    }

    // Fallback: embed the episode page itself as an iframe
    return NextResponse.json({
      sources: [{ url: epUrl, type: "iframe", quality: "AniNeko", isM3U8: false }],
    });

  } catch (err) {
    const msg = (err as Error).message?.slice(0, 300) || "unknown";
    console.error("Stream error:", msg);
    return NextResponse.json({ error: "Failed to fetch stream", detail: msg }, { status: 500 });
  }
}
