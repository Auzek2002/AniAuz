/**
 * Path-preserving Megacloud proxy.
 *
 * Usage (iframe src):
 *   /mc/embed-2/v3/e-1/VIDEO_ID?k=1&__ref=https://aniwatchtv.to/watch/...
 *
 * This mirrors the real megacloud URL path so that:
 *   - window.location.pathname  → /mc/embed-2/v3/e-1/VIDEO_ID
 *   - window.location.search    → ?k=1  (k param is readable)
 *   - The player can extract VIDEO_ID via pathname.split('/').pop()
 *
 * An injected <script> handles the rest:
 *   - Spoofs document.referrer to aniwatchtv.to
 *   - Intercepts fetch/XHR and routes megacloud API calls through /api/mc-proxy
 *   - Resolves relative /path API calls against megacloud.blog
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MEGACLOUD_ORIGIN = "https://megacloud.blog";
const WATCH_DOMAIN = process.env.ANIWATCH_DOMAIN || "aniwatchtv.to";

function buildInjector(apiProxyBase: string, ref: string, mcUrl: string): string {
  const parsed = new URL(mcUrl);
  // The player may read these from window.location
  const mcPathname = parsed.pathname;
  const mcSearch   = parsed.search;
  const mcHost     = parsed.host;
  const mcHref     = parsed.href;

  return `<script>
(function(){
  /* 1. Spoof document.referrer so the player's domain whitelist check passes */
  try {
    Object.defineProperty(document,'referrer',{
      get:function(){return ${JSON.stringify(ref)};},
      configurable:true
    });
  } catch(e){}

  /* 2. Try to spoof window.location so pathname/search/hostname look like megacloud */
  try {
    var _rl=window.location;
    var _fl=new Proxy(_rl,{
      get:function(t,p){
        if(p==='hostname'||p==='host') return ${JSON.stringify(mcHost)};
        if(p==='origin')               return ${JSON.stringify(parsed.origin)};
        if(p==='pathname')             return ${JSON.stringify(mcPathname)};
        if(p==='search')               return ${JSON.stringify(mcSearch)};
        if(p==='href')                 return ${JSON.stringify(mcHref)};
        var v=t[p]; return typeof v==='function'?v.bind(t):v;
      }
    });
    Object.defineProperty(window,'location',{get:function(){return _fl;},configurable:true});
  } catch(e){}

  /* 3. Intercept fetch/XHR — route megacloud calls through our server proxy */
  var P=${JSON.stringify(apiProxyBase)};
  /* CRITICAL: Referer for intercepted calls must be the megacloud embed URL itself,
     NOT the aniwatchtv.to page. The getSources API and CDN both expect the embed
     page as Referer since the requests originate from within that embed page. */
  var R=${JSON.stringify(mcUrl)};
  var MC=${JSON.stringify(MEGACLOUD_ORIGIN)};
  /* Our own proxy host — never re-proxy requests already going to our server */
  var ownHost=new URL(P).hostname;

  function px(u){
    if(typeof u!=='string') return u;
    try{
      var parsed=new URL(u);
      var h=parsed.hostname;
      /* Skip requests already destined for our proxy (avoid double-proxying) */
      if(h===ownHost) return u;
      /* Same-origin requests that are actually megacloud embed API calls */
      var path=parsed.pathname;
      if((h===location.hostname||h==='localhost'||h==='127.0.0.1')
          &&(path.startsWith('/embed-2/')||path.startsWith('/embed/'))){
        return P+'?url='+encodeURIComponent(MC+path+parsed.search)+'&ref='+encodeURIComponent(R);
      }
      /* Proxy ALL other cross-origin requests — megacloud may serve M3U8/segments
         from any CDN domain; proxying all of them avoids CORS failures. */
      return P+'?url='+encodeURIComponent(u)+'&ref='+encodeURIComponent(R);
    }catch(e){
      /* Relative URL — resolve against megacloud.blog */
      if(typeof u==='string'&&u.startsWith('/')){
        return P+'?url='+encodeURIComponent(MC+u)+'&ref='+encodeURIComponent(R);
      }
      return u;
    }
  }

  var oF=window.fetch;
  window.fetch=function(u,o){ return oF.call(this,px(u),o); };

  var oO=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u,a,us,pw){
    return oO.call(this,m,px(u),a===undefined?true:a,us,pw);
  };
})();
</script>`;
}

const FETCH_HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);

  // Path after /mc  →  /embed-2/v3/e-1/VIDEO_ID
  const mcPath = reqUrl.pathname.slice("/mc".length) || "/";

  // Strip our custom __ref param before forwarding to megacloud
  const params = new URLSearchParams(reqUrl.search);
  const ref = params.get("__ref") || `https://${WATCH_DOMAIN}/`;
  params.delete("__ref");

  const mcUrl = `${MEGACLOUD_ORIGIN}${mcPath}${params.size ? "?" + params.toString() : ""}`;

  let refOrigin: string;
  try { refOrigin = new URL(ref).origin; } catch { refOrigin = `https://${WATCH_DOMAIN}`; }

  try {
    const res = await fetch(mcUrl, {
      headers: {
        ...FETCH_HEADERS,
        "Referer": ref,
        "Origin":  refOrigin,
      },
    });

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    if (contentType.includes("text/html")) {
      let html = await res.text();

      // <base href> makes relative HTML resource URLs (img, link) resolve to megacloud.blog
      const baseTag  = `<base href="${MEGACLOUD_ORIGIN}/">`;
      const apiProxy = `${reqUrl.origin}/api/mc-proxy`;
      const injector = buildInjector(apiProxy, ref, mcUrl);

      html = html.includes("<head>")
        ? html.replace("<head>", `<head>${baseTag}${injector}`)
        : baseTag + injector + html;

      // Forward any session cookies megacloud sets — the player may need them for API calls
      const responseHeaders = new Headers({
        "Content-Type":              "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });

      // Forward Set-Cookie headers (strip domain restriction so browser stores them)
      const rawCookies: string[] = [];
      res.headers.forEach((v, k) => {
        if (k.toLowerCase() === "set-cookie") rawCookies.push(v);
      });
      for (const cookie of rawCookies) {
        const cleaned = cookie
          .replace(/domain=[^;]+;?\s*/gi, "")
          .replace(/samesite=strict/gi, "SameSite=Lax");
        responseHeaders.append("Set-Cookie", cleaned);
      }

      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    // Non-HTML resources — pass through
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":              contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control":             "public, max-age=3600",
      },
    });

  } catch (err) {
    console.error("MC path proxy error:", (err as Error).message);
    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}
