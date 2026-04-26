"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, AlertCircle } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import { StreamData } from "@/types";

interface UniversalPlayerProps {
  anilistId: number;
  episodeNumber: number;
  hianimeEpisodeId?: string; // anitaku format: "slug|epNum", e.g. "attack-on-titan|1"
  title?: string;
  onEnded?: () => void;
}

const FALLBACK_SERVERS = [
  { name: "Smashy", url: (id: number, ep: number) => `https://player.smashy.stream/anime/${id}?ep=${ep}` },
  { name: "2Embed", url: (id: number, ep: number) => `https://www.2embed.skin/embed/anime/${id}/${ep}` },
  { name: "2Anime", url: (id: number, ep: number) => `https://2anime.xyz/embed/anilist-${id}-${ep}` },
];

type PlayerMode =
  | { kind: "gogo"; sourceIdx: number }
  | { kind: "fallback"; serverIdx: number };

export default function UniversalPlayer({
  anilistId,
  episodeNumber,
  hianimeEpisodeId,
  title,
  onEnded,
}: UniversalPlayerProps) {
  const [mode, setMode] = useState<PlayerMode>({ kind: "gogo", sourceIdx: 0 });
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const fetchStream = useCallback(async () => {
    if (!hianimeEpisodeId) {
      setFetchError("No episode source available.");
      setStreamData(null);
      return;
    }
    setLoading(true);
    setFetchError(null);
    setStreamData(null);
    try {
      const res = await fetch(`/api/stream?ep=${encodeURIComponent(hianimeEpisodeId)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Stream API returned ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = (await res.json()) as StreamData;
      if (!data.sources || data.sources.length === 0) throw new Error("No sources returned.");
      setStreamData(data);
    } catch (err) {
      setFetchError((err as Error).message || "Failed to load stream.");
    } finally {
      setLoading(false);
    }
  }, [hianimeEpisodeId]);

  useEffect(() => {
    setMode({ kind: "gogo", sourceIdx: 0 });
    setIframeKey(k => k + 1);
    fetchStream();
  }, [fetchStream]);

  const gogoSources = streamData?.sources ?? [];
  const isAllIframe = gogoSources.length > 0 && gogoSources.every(s => s.type === "iframe");

  const currentUrl =
    mode.kind === "gogo"
      ? gogoSources[mode.sourceIdx]?.url
      : FALLBACK_SERVERS[mode.serverIdx].url(anilistId, episodeNumber);

  const modeKey =
    mode.kind === "gogo" ? `gogo-${mode.sourceIdx}` : `fallback-${mode.serverIdx}`;

  const activeLabel =
    mode.kind === "gogo"
      ? (gogoSources[mode.sourceIdx]?.quality || `Server ${mode.sourceIdx + 1}`)
      : FALLBACK_SERVERS[mode.serverIdx].name;

  return (
    <div className="space-y-2">
      <div
        className="relative w-full rounded-xl overflow-hidden bg-black"
        style={{ aspectRatio: "16/9" }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading sources...</p>
            </div>
          </div>
        ) : fetchError && mode.kind === "gogo" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-md px-6">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-gray-300">Could not load episode.</p>
              <p className="text-xs text-gray-500">{fetchError}</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={fetchStream}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
                <button
                  onClick={() => { setMode({ kind: "fallback", serverIdx: 0 }); setIframeKey(k => k + 1); }}
                  className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                >
                  Try fallback servers
                </button>
              </div>
            </div>
          </div>
        ) : !isAllIframe && mode.kind === "gogo" && streamData ? (
          // m3u8 sources — native HLS player
          <div className="absolute inset-0">
            <VideoPlayer
              streamData={streamData}
              loading={false}
              title={title}
              onEnded={onEnded}
            />
          </div>
        ) : currentUrl ? (
          <iframe
            key={`${modeKey}-${iframeKey}`}
            src={currentUrl}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-presentation"
            className="absolute inset-0 w-full h-full border-0"
            title={title || `Episode ${episodeNumber}`}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500">Servers:</span>

          {gogoSources.map((src, i) => {
            const isActive = mode.kind === "gogo" && mode.sourceIdx === i;
            return (
              <button
                key={i}
                onClick={() => { setMode({ kind: "gogo", sourceIdx: i }); setIframeKey(k => k + 1); }}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${isActive ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}
              >
                {src.quality || `Server ${i + 1}`}
              </button>
            );
          })}

          {gogoSources.length > 0 && (
            <span className="text-gray-700 text-xs">|</span>
          )}

          {FALLBACK_SERVERS.map((s, i) => {
            const isActive = mode.kind === "fallback" && mode.serverIdx === i;
            return (
              <button
                key={s.name}
                onClick={() => { setMode({ kind: "fallback", serverIdx: i }); setIframeKey(k => k + 1); }}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${isActive ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIframeKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
          <span className="text-xs text-gray-600 hidden sm:block">Active: {activeLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Play className="w-3 h-3" />
        <span>Switch servers if a video won&apos;t play.</span>
      </div>
    </div>
  );
}
