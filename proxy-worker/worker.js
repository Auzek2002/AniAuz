/**
 * AniAuz Proxy Worker
 *
 * Generic reverse proxy that adds the correct Referer/Origin headers so the
 * Megacloud CDN accepts requests. Runs on Cloudflare's edge — Cloudflare IPs
 * are not on the Vercel/AWS datacenter blocklist that Megacloud uses.
 *
 * Query params:
 *   url     — required, the target URL to fetch
 *   referer — the Referer header to send (also accepted as `ref`)
 *
 * Features:
 *   - Forwards request method + body + Range header (needed for byte-range
 *     requests on media segments and MP4 seeking)
 *   - Accepts both `referer` and `ref` param names
 *   - Strips CSP, X-Frame-Options, Set-Cookie so the response can be used
 *     cross-origin and iframed
 *   - Correct Cache-Control per content type (no-cache for m3u8, long-cache
 *     for segments)
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, Accept",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

function isManifest(url, contentType) {
  return (
    url.includes(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  );
}

function isSegment(url) {
  const path = url.split("?")[0].toLowerCase();
  return /\.(ts|m4s|mp4|m4a|aac|webm|mpd|vtt|ass|srt)$/.test(path);
}

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    // Accept both `referer` (from /api/proxy) and `ref` (from /api/mc-proxy)
    const referer =
      url.searchParams.get("referer") ||
      url.searchParams.get("ref") ||
      "https://megacloud.blog/";

    if (!target) {
      return new Response("Missing url param", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    let refOrigin;
    try {
      refOrigin = new URL(referer).origin;
    } catch {
      refOrigin = "https://megacloud.blog";
    }

    // Build outbound headers — spoof Referer/Origin, forward Range + Content-Type
    const outHeaders = {
      "User-Agent": UA,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": referer,
      "Origin": refOrigin,
    };
    const range = request.headers.get("Range");
    if (range) outHeaders["Range"] = range;
    const reqCT = request.headers.get("Content-Type");
    if (reqCT && request.method !== "GET" && request.method !== "HEAD") {
      outHeaders["Content-Type"] = reqCT;
    }

    const body =
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined;

    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers: outHeaders,
        body,
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err.message}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    // Build response headers — copy content-type and Range-related headers,
    // strip anything that would block cross-origin / iframe use.
    const respHeaders = new Headers();
    for (const [k, v] of upstream.headers) {
      const kl = k.toLowerCase();
      if (
        kl === "content-security-policy" ||
        kl === "content-security-policy-report-only" ||
        kl === "x-frame-options" ||
        kl === "cross-origin-opener-policy" ||
        kl === "cross-origin-embedder-policy" ||
        kl === "cross-origin-resource-policy" ||
        kl === "set-cookie" ||
        kl === "strict-transport-security" ||
        // Drop content-encoding — Cloudflare will re-encode based on client Accept-Encoding
        kl === "content-encoding" ||
        kl === "content-length"
      )
        continue;
      respHeaders.set(k, v);
    }

    for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v);

    const ct = upstream.headers.get("Content-Type") || "";
    if (isManifest(target, ct)) {
      respHeaders.set("Cache-Control", "no-cache");
    } else if (isSegment(target)) {
      respHeaders.set("Cache-Control", "public, max-age=86400");
    } else {
      respHeaders.set("Cache-Control", "public, max-age=3600");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  },
};
