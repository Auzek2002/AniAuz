import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const maxDuration = 60;

const WORKER_URL = process.env.PROXY_WORKER_URL || "";
const ENC_API = "https://enc-dec.app/api";
const ANIKAI = "https://anikai.to";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

// Route a GET through the CF Worker when PROXY_WORKER_URL is set.
// anikai.to blocks Vercel datacenter IPs; Cloudflare Worker IPs bypass this.
async function proxyGet(url: string, referer: string): Promise<Response> {
  if (WORKER_URL) {
    return fetch(`${WORKER_URL}?url=${encodeURIComponent(url)}&ref=${encodeURIComponent(referer)}`);
  }
  return fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}

// Generate a token via enc-dec.app (no IP restrictions — accessible from Vercel directly)
async function generateToken(text: string): Promise<string> {
  const res = await fetch(`${ENC_API}/enc-kai?text=${encodeURIComponent(text)}`);
  const json = (await res.json()) as { result?: string };
  if (!json.result) throw new Error("enc-kai returned no result");
  return json.result;
}

// Decode iframe data via enc-dec.app
async function decodeIframeData(
  text: string,
): Promise<{ url: string; skip: { intro: [number, number]; outro: [number, number] } }> {
  const res = await fetch(`${ENC_API}/dec-kai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = (await res.json()) as { result?: { url: string; skip: { intro: [number, number]; outro: [number, number] } } };
  if (!json.result) throw new Error("dec-kai returned no result");
  return json.result;
}

// Decode MegaUp media via enc-dec.app
async function decodeMega(text: string): Promise<{
  sources: { file: string }[];
  tracks: { kind: string; file: string; label: string }[];
  download: string;
}> {
  const res = await fetch(`${ENC_API}/dec-mega`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, agent: UA }),
  });
  const json = (await res.json()) as {
    result?: { sources: { file: string }[]; tracks: { kind: string; file: string; label: string }[]; download: string };
  };
  if (!json.result) throw new Error("dec-mega returned no result");
  return json.result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("ep");

  if (!episodeId) {
    return NextResponse.json({ error: "Episode ID required" }, { status: 400 });
  }

  try {
    // Extract the per-episode token embedded in the ID by consumet's AnimeKai scraper
    const token = episodeId.split("$token=")[1];
    if (!token) throw new Error("Invalid episode ID format (missing token)");

    // Step 1: generate auth token for anikai.to AJAX (via enc-dec.app, no IP issues)
    const authToken = await generateToken(token);

    // Step 2: fetch servers list — route through CF Worker to bypass Vercel IP block
    const listUrl = `${ANIKAI}/ajax/links/list?token=${token}&_=${authToken}`;
    const listRes = await proxyGet(listUrl, `${ANIKAI}/`);
    if (!listRes.ok) throw new Error(`links/list returned ${listRes.status}`);
    const listJson = (await listRes.json()) as { result?: string };
    if (!listJson.result) throw new Error("links/list: empty result");

    const $ = cheerio.load(listJson.result);
    // Pick first softsub server (falls back to dub if no sub exists)
    const serverItems = $('.server-items.lang-group[data-id="softsub"] .server, .server-items.lang-group[data-id="dub"] .server');
    const firstServer = serverItems.first();
    const serverId = firstServer.attr("data-lid");
    if (!serverId) throw new Error("No server found in links/list response");

    // Step 3: get embed URL for this server — also via CF Worker
    const viewAuthToken = await generateToken(serverId);
    const viewUrl = `${ANIKAI}/ajax/links/view?id=${serverId}&_=${viewAuthToken}`;
    const viewRes = await proxyGet(viewUrl, `${ANIKAI}/`);
    if (!viewRes.ok) throw new Error(`links/view returned ${viewRes.status}`);
    const viewJson = (await viewRes.json()) as { result?: string };
    if (!viewJson.result) throw new Error("links/view: empty result");

    // Step 4: decode the iframe URL (enc-dec.app, no IP issues)
    const iframeData = await decodeIframeData(viewJson.result);
    const iframeUrl = iframeData.url; // e.g. https://megaup.nl/e/{id}

    // Step 5: fetch the MegaUp media page — via CF Worker (megaup.nl may also check origin)
    const mediaUrl = iframeUrl.replace("/e/", "/media/");
    const mediaRes = await proxyGet(mediaUrl, iframeUrl);
    if (!mediaRes.ok) throw new Error(`megaup media returned ${mediaRes.status}`);
    const mediaJson = (await mediaRes.json()) as { result?: string };
    if (!mediaJson.result) throw new Error("megaup media: empty result");

    // Step 6: decrypt the media data (enc-dec.app, no IP issues)
    const decrypted = await decodeMega(mediaJson.result);

    const sources = decrypted.sources.map((s) => ({
      url: s.file,
      isM3U8: s.file.includes(".m3u8"),
      type: "hls",
    }));
    const subtitles = (decrypted.tracks || [])
      .filter((t) => t.kind === "captions")
      .map((t) => ({ url: t.file, lang: t.label || "subtitles" }));

    return NextResponse.json({
      sources,
      subtitles,
      headers: { Referer: iframeUrl },
      intro: iframeData.skip?.intro ? { start: iframeData.skip.intro[0], end: iframeData.skip.intro[1] } : undefined,
      outro: iframeData.skip?.outro ? { start: iframeData.skip.outro[0], end: iframeData.skip.outro[1] } : undefined,
    });
  } catch (err) {
    const msg = (err as Error).message?.slice(0, 300) || "unknown";
    console.error("Stream error:", msg);
    return NextResponse.json({ error: "Failed to fetch stream", detail: msg }, { status: 500 });
  }
}
