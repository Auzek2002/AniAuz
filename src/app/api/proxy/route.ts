import { NextResponse } from "next/server";

export const runtime = "nodejs";

// If PROXY_WORKER_URL is set (Cloudflare Worker), segments are sent there instead
// of being proxied through Vercel. Only m3u8 manifests go through Vercel.
const WORKER_URL = process.env.PROXY_WORKER_URL || "";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

function buildSegmentUrl(absoluteUrl: string, referer: string, origin: string): string {
  // Route segments through Cloudflare Worker when available, otherwise fall back to Vercel proxy
  const base = WORKER_URL || "/api/proxy";
  return `${base}?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
}

// Keep the Vercel proxy URL builder for manifest sub-resources (key files, etc.)
function buildProxyUrl(absoluteUrl: string, referer: string, origin: string): string {
  return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
}

function rewriteM3u8(content: string, baseUrl: string, referer: string, origin: string): string {
  const base = new URL(baseUrl);
  return content.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      // Key/map URIs are small — keep on Vercel proxy
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = resolveUrl(uri, base);
        return `URI="${buildProxyUrl(abs, referer, origin)}"`;
      });
    }
    // Segment URLs — route through Cloudflare Worker if configured
    const abs = resolveUrl(trimmed, base);
    return buildSegmentUrl(abs, referer, origin);
  }).join("\n");
}

function resolveUrl(url: string, base: URL): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return base.protocol + url;
  if (url.startsWith("/")) return `${base.protocol}//${base.host}${url}`;
  const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  return dir + url;
}

function isM3u8(url: string, contentType: string): boolean {
  return (
    url.includes(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  );
}

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const url = reqUrl.searchParams.get("url");
  const referer = reqUrl.searchParams.get("referer") || "https://megacloud.blog/";
  const origin = reqUrl.searchParams.get("origin") || new URL(referer).origin;

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, "Referer": referer, "Origin": origin },
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    if (isM3u8(url, contentType)) {
      const text = await res.text();
      const rewritten = rewriteM3u8(text, url, referer, origin);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Proxy error:", (error as Error).message);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
