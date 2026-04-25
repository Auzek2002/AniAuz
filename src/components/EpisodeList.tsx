"use client";

import { useState, useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { ConsumetEpisode } from "@/types";
import Image from "next/image";

interface EpisodeListProps {
  episodes:         ConsumetEpisode[];
  currentEpisodeId?: string;
  onSelectEpisode:  (episode: ConsumetEpisode) => void;
  animeTitle?:      string;
}

const RANGE = 24;

export default function EpisodeList({ episodes, currentEpisodeId, onSelectEpisode, animeTitle }: EpisodeListProps) {
  const [rangeIdx,  setRangeIdx]  = useState(0);
  const activeRef = useRef<HTMLButtonElement>(null);

  const totalRanges = Math.ceil(episodes.length / RANGE);
  const ranges = Array.from({ length: totalRanges }, (_, i) => ({
    label: `${i * RANGE + 1}–${Math.min((i + 1) * RANGE, episodes.length)}`,
    start: i * RANGE,
    end:   Math.min((i + 1) * RANGE, episodes.length),
  }));

  // Auto-jump to range containing current episode
  useEffect(() => {
    if (!currentEpisodeId) return;
    const idx = episodes.findIndex(e => e.id === currentEpisodeId);
    if (idx >= 0) setRangeIdx(Math.floor(idx / RANGE));
  }, [currentEpisodeId, episodes]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentEpisodeId, rangeIdx]);

  if (!episodes.length) {
    return (
      <div className="py-12 text-center">
        <Play className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No episodes available yet.</p>
      </div>
    );
  }

  const displayEps = episodes.slice(ranges[rangeIdx].start, ranges[rangeIdx].end);

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 font-medium">{episodes.length} Episodes</span>

          {/* Range selector */}
          {totalRanges > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {ranges.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setRangeIdx(i)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    i === rangeIdx
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="space-y-1.5">
          {displayEps.map(ep => {
            const isActive = ep.id === currentEpisodeId;
            return (
              <button
                key={ep.id}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelectEpisode(ep)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group ${
                  isActive
                    ? "bg-violet-600/15 border border-violet-500/30"
                    : "bg-white/3 hover:bg-white/7 border border-white/4 hover:border-white/10"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-[72px] h-[44px] rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                  {ep.image ? (
                    <Image src={ep.image} alt={ep.title || `Episode ${ep.number}`} fill className="object-cover" sizes="72px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-violet-600/50 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Number badge */}
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isActive ? "bg-violet-600 text-white" : "bg-white/8 text-gray-400 group-hover:bg-violet-600/20 group-hover:text-violet-300"
                } transition-all`}>
                  {ep.number}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-violet-300" : "text-gray-200 group-hover:text-white"} transition-colors`}>
                    {ep.title && ep.title !== `Episode ${ep.number}` ? ep.title : `Episode ${ep.number}`}
                  </p>
                  {ep.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{ep.description}</p>
                  )}
                </div>

                <Play className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-violet-400 fill-violet-400" : "text-gray-600 group-hover:text-gray-400"}`} />
              </button>
            );
          })}
        </div>

      <span className="hidden">{animeTitle}</span>
    </div>
  );
}
