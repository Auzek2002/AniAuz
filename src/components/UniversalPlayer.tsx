"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, AlertCircle } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import { StreamData } from "@/types";

interface UniversalPlayerProps {
  anilistId: number;
  episodeNumber: number;
  hianimeEpisodeId?: string; // e.g. "my-hero-academia-7l5n?ep=12345"
  title?: string;
  onEnded?: () => void;
}

// Self-contained iframe providers — fallback only. These go up and down
// constantly so they're not something we can rely on as a primary path.
const EMBED_SERVERS = [
  { name: "Smashy Stream", url: (id: number, ep: number) => `https://player.smashy.stream/anime/${id}?ep=${ep}` },
  { name: "2Embed",        url: (id: number, ep: number) => `https://www.2embed.skin/embed/anime/${id}/${ep}` },
  { name: "2Anime",        url: (id: number, ep: number) => `https://2anime.xyz/embed/anilist-${id}-${ep}` },
];

type Mode =
  | { kind: "direct" }                    // Native hls.js player via /api/stream
  | { kind: "embed"; serverIdx: number }; // Third-party iframe

export default function UniversalPlayer({
  anilistId,
  episodeNumber,
  hianimeEpisodeId,
  title,
  onEnded,
}: UniversalPlayerProps) {
  const [mode, setMode] = useState<Mode>({ kind: "direct" });
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Fetch the direct stream whenever the episode changes. We go through
  // /api/stream → aniwatch scraper → Megacloud decryption → m3u8 URL.
  // The m3u8 and its segments are then served through /api/proxy + the
  // Cloudflare Worker, bypassing Vercel's IP block entirely.
  const fetchStream = useCallback(async () => {
    if (!hianimeEpisodeId) {
      setStreamError("No stream source available for this episode.");
      setStreamData(null);
      return;
    }
    setStreamLoading(true);
    setStreamError(null);
    setStreamData(null);

    try {
      const res = await fetch(`/api/stream?ep=${encodeURIComponent(hianimeEpisodeId)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Stream API returned ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = (await res.json()) as StreamData;
      if (!data.sources || data.sources.length === 0) {
        throw new Error("No playable sources returned.");
      }
      setStreamData(data);
    } catch (err) {
      setStreamError((err as Error).message || "Failed to load stream.");
      setStreamData(null);
    } finally {
      setStreamLoading(false);
    }
  }, [hianimeEpisodeId]);

  // Reset + fetch when episode changes
  useEffect(() => {
    setMode({ kind: "direct" });
    setIframeKey(k => k + 1);
    fetchStream();
  }, [fetchStream]);

  const reload = () => {
    if (mode.kind === "direct") {
      fetchStream();
    } else {
      setIframeKey(k => k + 1);
    }
  };

  const activeLabel =
    mode.kind === "direct" ? "Direct" : EMBED_SERVERS[mode.serverIdx].name;

  return (
    <div className="space-y-2">
      <div className="relative">
        {mode.kind === "direct" ? (
          streamError ? (
            <div className="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
              <div className="text-center space-y-3 max-w-md px-6">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-sm text-gray-300">Direct stream unavailable.</p>
                <p className="text-xs text-gray-500">{streamError}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button onClick={fetchStream} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                  <button onClick={() => setMode({ kind: "embed", serverIdx: 0 })} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg">
                    Try embed servers
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <VideoPlayer
              streamData={streamData}
              loading={streamLoading}
              title={title}
              onEnded={onEnded}
            />
          )
        ) : (
          <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
            <iframe
              key={`${EMBED_SERVERS[mode.serverIdx].name}-${iframeKey}`}
              src={EMBED_SERVERS[mode.serverIdx].url(anilistId, episodeNumber)}
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              className="absolute inset-0 w-full h-full border-0"
              title={title || `Episode ${episodeNumber}`}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500">Servers:</span>

          <button
            onClick={() => setMode({ kind: "direct" })}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${mode.kind === "direct" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}
            title="Native HLS player via your Cloudflare Worker"
          >
            Direct
          </button>

          {EMBED_SERVERS.map((s, i) => {
            const isActive = mode.kind === "embed" && mode.serverIdx === i;
            return (
              <button
                key={s.name}
                onClick={() => {
                  setMode({ kind: "embed", serverIdx: i });
                  setIframeKey(k => k + 1);
                }}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${isActive ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
          <span className="text-xs text-gray-600 hidden sm:block">Active: {activeLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Play className="w-3 h-3" />
        <span>Direct uses your Cloudflare Worker. If it fails, try an embed server.</span>
      </div>
    </div>
  );
}
