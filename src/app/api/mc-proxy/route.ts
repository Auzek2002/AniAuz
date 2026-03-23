/**
 * Megacloud resource proxy.
 *
 * Handles GET and POST requests from the fetch/XHR interceptor injected into
 * the Megacloud embed page. Adds the correct Referer header before forwarding
 * to megacloud's servers.
 *
 * Also rewrites M3U8 manifests so all segment/key URLs are absolute CDN URLs,
 * allowing the player's subsequent segment requests to be intercepted and
 * proxied correctly.
 */

import { NextResponse } from "next/server";

export const runtime  = "nodejs";
export const maxDuration = 30;

const WATCH_DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";

const ALLOWED_HOSTS = ["megacloud.blog", "megacloud.net", "megacloud.tv", "megacloud.co"];

function isAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
}

// ── M3U8 rewriting ────────────────────────────────────────────────────────────
// Resolve a possibly-relative URL against a base URL string.
function resolveUrl(url: string, base: URL): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//"))  return base.protocol + url;
  if (url.startsWith("/"))   return `${base.protocol}//${base.host}${url}`;
  const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  return dir + url;
}

// Rewrite a raw M3U8 manifest so every segment, key, and sub-manifest URI
// goes through our proxy endpoint directly.  This avoids any dependency on
// the browser-side fetch/XHR interceptor for media content, works for any
// CDN domain megacloud uses, and is CORS-safe (same-origin to our domain).
function rewriteM3u8(
  text: string,
  baseUrl: string,
  proxyBase: string,
  referer: string,
): string {
  const base = new URL(baseUrl);

  function toProxy(url: string): string {
    const abs = resolveUrl(url, base);
    return `${proxyBase}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}`;
  }

  return text.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith("#")) {
      // Rewrite URI="..." inside tags (encryption keys, sub-manifests, etc.)
      return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toProxy(uri)}"`);
    }

    // Segment / sub-manifest line
    return toProxy(trimmed);
  }).join("\n");
}

function looksLikeM3u8(url: string, contentType: string): boolean {
  return (
    url.includes(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────
const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":          "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

async function handleRequest(request: Request): Promise<NextResponse> {
  const reqUrl = new URL(request.url);
  const url    = reqUrl.searchParams.get("url");
  const ref    = reqUrl.searchParams.get("ref") || `https://${WATCH_DOMAIN}/`;

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  if (!isAllowed(parsed.hostname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let refOrigin: string;
  try { refOrigin = new URL(ref).origin; } catch { refOrigin = `https://${WATCH_DOMAIN}`; }

  const body        = request.method === "POST" ? await request.arrayBuffer() : undefined;
  const reqCT       = request.headers.get("content-type");
  const cookieHdr   = request.headers.get("cookie");

  try {
    const res = await fetch(url, {
      method:  request.method,
      headers: {
        ...BASE_HEADERS,
        "Referer": ref,
        "Origin":  refOrigin,
        ...(reqCT    ? { "Content-Type": reqCT }     : {}),
        ...(cookieHdr ? { "Cookie": cookieHdr }      : {}),
      },
      body,
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    // Rewrite M3U8 manifests so all segment/key/sub-manifest URLs go through
    // our proxy directly (same-origin, no CORS issues on Vercel).
    if (looksLikeM3u8(url, contentType)) {
      const text      = await res.text();
      const proxyBase = `${reqUrl.origin}/api/mc-proxy`;
      const rewritten = rewriteM3u8(text, url, proxyBase, ref);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type":              "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control":             "no-cache",
        },
      });
    }

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: 200,
      headers: {
        "Content-Type":              contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range",
        "Cache-Control":             contentType.includes("json") ? "no-cache" : "public, max-age=3600",
      },
    });

  } catch (err) {
    console.error("MC proxy error:", (err as Error).message);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export const GET  = handleRequest;
export const POST = handleRequest;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  });
}
