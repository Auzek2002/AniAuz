/**
 * AniAuz Proxy Worker
 * Adds Referer header to video segment requests so the CDN accepts them.
 * Deployed on Cloudflare Workers free tier — handles all segment traffic
 * so Vercel only serves the lightweight m3u8 manifest.
 */

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    const target  = url.searchParams.get("url");
    const referer = url.searchParams.get("referer") || "https://megacloud.blog/";

    if (!target) {
      return new Response("Missing url param", { status: 400 });
    }

    let origin;
    try {
      origin = new URL(referer).origin;
    } catch {
      origin = "https://megacloud.blog";
    }

    const res = await fetch(target, {
      headers: {
        "Referer": referer,
        "Origin": origin,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    const contentType = res.headers.get("Content-Type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  },
};
