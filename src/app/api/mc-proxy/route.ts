/**
 * Megacloud resource proxy.
 *
 * Set PROXY_WORKER_URL in your environment to route all CDN fetches through a
 * Cloudflare Worker. This is REQUIRED on Vercel because MegaCloud's CDN blocks
 * Vercel/AWS datacenter IPs. Cloudflare edge IPs are NOT on those blocklists.
 *
 * See the Cloudflare Worker script at the bottom of this file (as a comment).
 */

import { NextResponse } from "next/server";

export const runtime  = "nodejs";
export const maxDuration = 30;

const WATCH_DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";

// When set, ALL external fetches are routed through this Cloudflare Worker URL.
// The Worker adds the correct Referer/Origin and uses Cloudflare edge IPs.
const WORKER_URL = process.env.PROXY_WORKER_URL || "";

// Block local/private addresses to prevent SSRF
function isAllowed(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) return false;
  return true;
}

const BASE_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":          "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

// Build the URL and headers to use when fetching an external resource.
// If WORKER_URL is set, route through the CF Worker (non-blocked edge IPs).
// Otherwise fetch directly from Vercel (may be blocked by CDN).
function buildFetch(targetUrl: string, referer: string, refOrigin: string): { url: string; headers: Record<string, string> } {
  if (WORKER_URL) {
    return {
      url: `${WORKER_URL}?url=${encodeURIComponent(targetUrl)}&ref=${encodeURIComponent(referer)}`,
      headers: {}, // Worker adds its own headers
    };
  }
  return {
    url: targetUrl,
    headers: {
      ...BASE_HEADERS,
      "Referer": referer,
      "Origin":  refOrigin,
    },
  };
}

// ── M3U8 rewriting ──────────────────────────────────────────────────────────
function resolveUrl(url: string, base: URL): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//"))  return base.protocol + url;
  if (url.startsWith("/"))   return `${base.protocol}//${base.host}${url}`;
  const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  return dir + url;
}

async function prefetchKeys(
  text: string,
  baseUrl: string,
  referer: string,
  refOrigin: string,
): Promise<Map<string, Buffer>> {
  const base   = new URL(baseUrl);
  const keyMap = new Map<string, Buffer>();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#EXT-X-KEY")) continue;
    const m = line.match(/URI="([^"]+)"/);
    if (!m) continue;
    const absUri = resolveUrl(m[1], base);
    if (keyMap.has(absUri)) continue;

    try {
      const { url: fetchUrl, headers: fetchHeaders } = buildFetch(absUri, referer, refOrigin);
      const keyRes = await fetch(fetchUrl, { headers: fetchHeaders });
      if (keyRes.ok) {
        keyMap.set(absUri, Buffer.from(await keyRes.arrayBuffer()));
      }
    } catch { /* key will fall back to proxy if fetch fails */ }
  }

  return keyMap;
}

function rewriteM3u8(
  text: string,
  baseUrl: string,
  proxyBase: string,
  referer: string,
  keyMap: Map<string, Buffer>,
): string {
  const base = new URL(baseUrl);

  function toProxy(url: string): string {
    const abs = resolveUrl(url, base);
    return `${proxyBase}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}`;
  }

  function toKeyOrProxy(uri: string): string {
    const abs      = resolveUrl(uri, base);
    const keyBytes = keyMap.get(abs);
    if (keyBytes) {
      return `${proxyBase}?key=${encodeURIComponent(keyBytes.toString("base64"))}`;
    }
    return toProxy(uri);
  }

  return text.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith("#")) {
      if (trimmed.startsWith("#EXT-X-KEY")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toKeyOrProxy(uri)}"`);
      }
      return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toProxy(uri)}"`);
    }

    // Sub-manifests must go through proxy so their segment URLs get rewritten too
    const abs = resolveUrl(trimmed, base);
    if (abs.includes(".m3u8")) return toProxy(abs);

    // Media segments: if WORKER_URL is set, route through CF Worker;
    // otherwise return the direct CDN URL (browser fetches with no Referer,
    // which CDNs typically allow as direct access).
    if (WORKER_URL) return toProxy(abs);
    return abs;
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

// ── Main handler ────────────────────────────────────────────────────────────
async function handleRequest(request: Request): Promise<NextResponse> {
  const reqUrl = new URL(request.url);

  // Serve a pre-fetched AES-128 key embedded as base64 in a rewritten M3U8
  const keyParam = reqUrl.searchParams.get("key");
  if (keyParam) {
    try {
      const keyBytes = Buffer.from(keyParam, "base64");
      return new NextResponse(keyBytes, {
        status: 200,
        headers: {
          "Content-Type":              "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control":             "no-cache",
        },
      });
    } catch {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
  }

  const url = reqUrl.searchParams.get("url");
  const ref = reqUrl.searchParams.get("ref") || `https://${WATCH_DOMAIN}/`;

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  if (!isAllowed(parsed.hostname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let refOrigin: string;
  try { refOrigin = new URL(ref).origin; } catch { refOrigin = `https://${WATCH_DOMAIN}`; }

  const body      = request.method === "POST" ? await request.arrayBuffer() : undefined;
  const reqCT     = request.headers.get("content-type");
  const cookieHdr = request.headers.get("cookie");

  try {
    const { url: fetchUrl, headers: fetchHeaders } = buildFetch(url, ref, refOrigin);
    const res = await fetch(fetchUrl, {
      method:  request.method,
      headers: {
        ...fetchHeaders,
        ...(reqCT     ? { "Content-Type": reqCT } : {}),
        ...(cookieHdr ? { "Cookie": cookieHdr }   : {}),
      },
      body,
    });

    if (!res.ok) {
      // If the CDN blocked our request (403), redirect the browser to fetch
      // the resource directly. The /mc page has Referrer-Policy: no-referrer
      // so the browser sends no Referer — CDNs treat no-Referer as direct
      // navigation and typically allow it. This is the fallback when no
      // PROXY_WORKER_URL is configured.
      if (res.status === 403) {
        return new NextResponse(null, {
          status: 302,
          headers: {
            "Location":                  url,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    if (looksLikeM3u8(url, contentType)) {
      const text      = await res.text();
      const proxyBase = `${reqUrl.origin}/api/mc-proxy`;
      const keyMap    = await prefetchKeys(text, url, ref, refOrigin);
      const rewritten = rewriteM3u8(text, url, proxyBase, ref, keyMap);
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
        "Content-Type":               contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range",
        "Cache-Control":              contentType.includes("json") ? "no-cache" : "public, max-age=3600",
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

/*
 * ── CLOUDFLARE WORKER SCRIPT ──────────────────────────────────────────────
 * Deploy this at https://workers.cloudflare.com (free, takes 2 minutes).
 * Then set PROXY_WORKER_URL=https://your-worker.workers.dev in Vercel env vars.
 *
 * =========================================================================
 *
 * export default {
 *   async fetch(request) {
 *     const url = new URL(request.url);
 *     if (request.method === "OPTIONS") {
 *       return new Response(null, { status: 204, headers: {
 *         "Access-Control-Allow-Origin": "*",
 *         "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
 *         "Access-Control-Allow-Headers": "Content-Type",
 *       }});
 *     }
 *     const target = url.searchParams.get("url");
 *     const ref    = url.searchParams.get("ref") || url.searchParams.get("referer") || "";
 *     if (!target) return new Response("URL required", { status: 400 });
 *     let refOrigin = "";
 *     try { refOrigin = new URL(ref).origin; } catch {}
 *     const headers = {
 *       "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
 *       "Accept": "*/*",
 *       "Accept-Language": "en-US,en;q=0.9",
 *     };
 *     if (ref)       headers["Referer"] = ref;
 *     if (refOrigin) headers["Origin"]  = refOrigin;
 *     const body = request.method === "POST" ? request.body : undefined;
 *     const resp = await fetch(target, { method: request.method, headers, body });
 *     const response = new Response(resp.body, { status: resp.status, headers: resp.headers });
 *     response.headers.set("Access-Control-Allow-Origin", "*");
 *     response.headers.delete("Content-Security-Policy");
 *     response.headers.delete("X-Frame-Options");
 *     return response;
 *   }
 * };
 *
 * =========================================================================
 */
