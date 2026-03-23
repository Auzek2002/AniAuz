/**
 * Megacloud resource proxy.
 *
 * Handles GET and POST requests from the fetch/XHR interceptor injected into
 * the Megacloud embed page. Adds the correct Referer header before forwarding
 * to megacloud's servers.
 *
 * M3U8 manifests are rewritten so:
 *   - All segment/sub-manifest URLs go through this proxy (CORS-safe, any CDN).
 *   - AES-128 encryption keys are pre-fetched server-side and served inline via
 *     ?key=<base64> — this prevents failures when megacloud's key server blocks
 *     datacenter IPs (Vercel/AWS).
 */

import { NextResponse } from "next/server";

export const runtime  = "nodejs";
export const maxDuration = 30;

const WATCH_DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";

// Block local/private addresses to prevent SSRF; allow any external CDN host
// since megacloud may serve M3U8 segments from arbitrary CDN domains.
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

// ── M3U8 rewriting ────────────────────────────────────────────────────────────
function resolveUrl(url: string, base: URL): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//"))  return base.protocol + url;
  if (url.startsWith("/"))   return `${base.protocol}//${base.host}${url}`;
  const dir = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  return dir + url;
}

// Pre-fetch all AES-128 keys referenced in an M3U8.
// Returns a map of absolute key URI → raw key bytes.
// Fetching server-side with the correct Referer/cookies avoids key-server IP blocks.
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
      const keyRes = await fetch(absUri, {
        headers: {
          ...BASE_HEADERS,
          "Referer": referer,
          "Origin":  refOrigin,
        },
      });
      if (keyRes.ok) {
        keyMap.set(absUri, Buffer.from(await keyRes.arrayBuffer()));
      }
    } catch { /* key will fall back to normal proxy if fetch fails */ }
  }

  return keyMap;
}

// Rewrite a raw M3U8 manifest:
//   - Segment/sub-manifest lines → proxy URL
//   - URI="..." in tags → proxy URL (or inline key if available in keyMap)
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
      // Serve the pre-fetched key from our own endpoint — browser never contacts
      // megacloud's key server, so datacenter IP blocking doesn't apply.
      return `${proxyBase}?key=${encodeURIComponent(keyBytes.toString("base64"))}`;
    }
    return toProxy(uri);
  }

  return text.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith("#")) {
      if (trimmed.startsWith("#EXT-X-KEY")) {
        // Use pre-fetched key (or fall back to proxy) for encryption key URIs
        return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toKeyOrProxy(uri)}"`);
      }
      // Other tags: rewrite any URI="..." through proxy
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

  // ── Serve a pre-fetched AES-128 key embedded in a rewritten M3U8 ─────────
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

  // ── Normal proxy request ──────────────────────────────────────────────────
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
    const res = await fetch(url, {
      method:  request.method,
      headers: {
        ...BASE_HEADERS,
        "Referer": ref,
        "Origin":  refOrigin,
        ...(reqCT     ? { "Content-Type": reqCT }  : {}),
        ...(cookieHdr ? { "Cookie": cookieHdr }    : {}),
      },
      body,
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    if (looksLikeM3u8(url, contentType)) {
      const text      = await res.text();
      const proxyBase = `${reqUrl.origin}/api/mc-proxy`;
      // Pre-fetch AES-128 keys server-side so the browser never has to contact
      // megacloud's key server (which often blocks datacenter/Vercel IPs).
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
