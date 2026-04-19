"use client";

import { useState, useEffect, useMemo } from "react";
import { Play, RefreshCw, Loader2 } from "lucide-react";


interface EmbedPlayerProps {
  anilistId: number;
  episodeNumber: number;
  hianimeEpisodeId?: string; // e.g. "my-hero-academia-7l5n?ep=12345"
  title?: string;
}

// Self-hosted third-party embeds — these providers run their own CDN / proxying
// infrastructure, so they work from any origin (including Vercel deployments)
// without our server needing to proxy segment traffic.
const SMASHY_SERVER = {
  name: "Smashy Stream",
  url: (id: number, ep: number) => `https://player.smashy.stream/anime/${id}?ep=${ep}`,
};
const TWOEMBED_SERVER = {
  name: "2Embed",
  url: (id: number, ep: number) => `https://www.2embed.skin/embed/anime/${id}/${ep}`,
};

// On localhost, Megacloud whitelists the origin so the direct embed works.
// On deployed hosts, we serve the embed through /mc/[path] which:
//   - Fetches the embed HTML server-side with the correct Referer (aniwatchtv.to)
//   - Injects a script that spoofs document.referrer so Megacloud's JS check passes
//   - Returns the page with Referrer-Policy: no-referrer so any direct CDN requests
//     from the browser send no Referer (user's IP + no Referer = allowed by CDN)
// The /mc proxy path only works reliably when PROXY_WORKER_URL is configured
// (a Cloudflare Worker), because Megacloud's CDN blocks Vercel/AWS datacenter IPs.
function buildProxiedSrc(embedLink: string, hianimeEpisodeId: string): string {
  const ref = `https://aniwatchtv.to/watch/${hianimeEpisodeId}`;

  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return embedLink; // Megacloud whitelists localhost natively
    }
  }

  try {
    const mcUrl = new URL(embedLink);
    const params = new URLSearchParams(mcUrl.search);
    params.set("__ref", ref);
    return `/mc${mcUrl.pathname}?${params.toString()}`;
  } catch {
    return `/api/mc-proxy?url=${encodeURIComponent(embedLink)}&ref=${encodeURIComponent(ref)}`;
  }
}

export default function EmbedPlayer({ anilistId, episodeNumber, hianimeEpisodeId, title }: EmbedPlayerProps) {
  const [embedLink, setEmbedLink] = useState<string | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [serverIdx, setServerIdx] = useState(0);
  const [key, setKey] = useState(0);

  // Fetch HiAnime megacloud embed link whenever the episode changes.
  // On deployed hosts this relies on PROXY_WORKER_URL being set to a Cloudflare
  // Worker so the CDN doesn't block Vercel datacenter IPs.
  useEffect(() => {
    if (!hianimeEpisodeId) {
      setEmbedLink(null);
      return;
    }
    setEmbedLink(null);
    setEmbedLoading(true);
    setKey(k => k + 1);

    fetch(`/api/embedlink?ep=${encodeURIComponent(hianimeEpisodeId)}`)
      .then(r => r.json())
      .then(data => { if (data.link) setEmbedLink(data.link); })
      .catch(() => {})
      .finally(() => setEmbedLoading(false));
  }, [hianimeEpisodeId]);

  // Reset server index when episode/anime changes
  useEffect(() => {
    setServerIdx(0);
    setKey(k => k + 1);
  }, [anilistId, episodeNumber, hianimeEpisodeId]);

  const proxiedSrc = embedLink && hianimeEpisodeId
    ? buildProxiedSrc(embedLink, hianimeEpisodeId)
    : null;

  // Server ordering — HiAnime first on both localhost and deployed (on deployed
  // this requires PROXY_WORKER_URL to be set so Megacloud's CDN doesn't block
  // Vercel IPs). Smashy / 2Embed are self-contained fallbacks.
  const servers = useMemo(() => {
    const hianime = proxiedSrc ? [{ name: "HiAnime", src: proxiedSrc }] : [];
    const thirdParty = [
      { name: SMASHY_SERVER.name, src: SMASHY_SERVER.url(anilistId, episodeNumber) },
      { name: TWOEMBED_SERVER.name, src: TWOEMBED_SERVER.url(anilistId, episodeNumber) },
    ];
    return [...hianime, ...thirdParty];
  }, [proxiedSrc, anilistId, episodeNumber]);

  const idx = Math.min(serverIdx, Math.max(0, servers.length - 1));
  const src = servers[idx]?.src ?? "";

  return (
    <div className="space-y-2">
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        {embedLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-sm text-gray-400">Fetching stream...</p>
          </div>
        ) : src ? (
          <iframe
            key={`${src}-${key}`}
            src={src}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            className="absolute inset-0 w-full h-full border-0"
            title={title || `Episode ${episodeNumber}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500">Servers:</span>
          {servers.map((s, i) => (
            <button key={`${s.name}-${i}`}
              onClick={() => { setServerIdx(i); setKey(k => k + 1); }}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${i === idx ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
          <span className="text-xs text-gray-600 hidden sm:block">If one server fails, try another</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Play className="w-3 h-3" />
        <span>Click the player to start. Enable pop-ups if prompted.</span>
      </div>
    </div>
  );
}
