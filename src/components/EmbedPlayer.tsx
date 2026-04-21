"use client";

import { useState, useEffect, useMemo } from "react";
import { Play, RefreshCw, Loader2 } from "lucide-react";

interface EmbedPlayerProps {
  anilistId: number;
  episodeNumber: number;
  hianimeEpisodeId?: string; // e.g. "my-hero-academia-7l5n?ep=12345"
  title?: string;
}

// Self-hosted third-party embeds — these providers run their own CDN /
// proxying infrastructure and accept AniList IDs, so they work from any
// origin (including Vercel deployments) without any of our proxy code.
const SMASHY_SERVER = {
  name: "Smashy Stream",
  url: (id: number, ep: number) => `https://player.smashy.stream/anime/${id}?ep=${ep}`,
};
const TWOEMBED_SERVER = {
  name: "2Embed",
  url: (id: number, ep: number) => `https://www.2embed.skin/embed/anime/${id}/${ep}`,
};
const TWOANIME_SERVER = {
  name: "2Anime",
  url: (id: number, ep: number) => `https://2anime.xyz/embed/anilist-${id}-${ep}`,
};

// HiAnime / Megacloud embed — only works on localhost (origin whitelisted) or
// on deployments with a working proxy chain (PROXY_WORKER_URL + not blocked by
// Megacloud's anti-bot). Inherently fragile in production, so we keep it as
// a last-resort option rather than the default on deployed sites.
function buildHiAnimeSrc(embedLink: string, hianimeEpisodeId: string): string {
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

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export default function EmbedPlayer({ anilistId, episodeNumber, hianimeEpisodeId, title }: EmbedPlayerProps) {
  const [embedLink, setEmbedLink] = useState<string | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [serverIdx, setServerIdx] = useState(0);
  const [key, setKey] = useState(0);
  const [isLocal, setIsLocal] = useState(false);

  // Detect environment client-side (window is undefined during SSR)
  useEffect(() => {
    setIsLocal(isLocalHost());
  }, []);

  // Fetch HiAnime megacloud embed link when on localhost. On deployed sites
  // Megacloud's anti-bot protection makes this path unreliable regardless of
  // which proxy we use, so we skip the fetch and rely on the third-party
  // embeds below — which handle their own streaming and work everywhere.
  useEffect(() => {
    if (!hianimeEpisodeId || !isLocal) {
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
  }, [hianimeEpisodeId, isLocal]);

  // Reset server index when episode/anime changes
  useEffect(() => {
    setServerIdx(0);
    setKey(k => k + 1);
  }, [anilistId, episodeNumber, hianimeEpisodeId]);

  const hianimeSrc = embedLink && hianimeEpisodeId
    ? buildHiAnimeSrc(embedLink, hianimeEpisodeId)
    : null;

  // Server ordering:
  //   localhost → HiAnime first (works natively via Megacloud origin whitelist)
  //   deployed  → Smashy Stream first, then 2Embed, then 2Anime. HiAnime is
  //               deliberately NOT included on deployed sites because
  //               Megacloud's CDN blocks every datacenter/proxy we can reach.
  const servers = useMemo(() => {
    const thirdParty = [
      { name: SMASHY_SERVER.name,   src: SMASHY_SERVER.url(anilistId, episodeNumber) },
      { name: TWOEMBED_SERVER.name, src: TWOEMBED_SERVER.url(anilistId, episodeNumber) },
      { name: TWOANIME_SERVER.name, src: TWOANIME_SERVER.url(anilistId, episodeNumber) },
    ];
    if (isLocal && hianimeSrc) {
      return [{ name: "HiAnime", src: hianimeSrc }, ...thirdParty];
    }
    return thirdParty;
  }, [isLocal, hianimeSrc, anilistId, episodeNumber]);

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
