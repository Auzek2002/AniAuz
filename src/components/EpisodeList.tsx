"use client";

import { useState } from "react";
import { Play, ChevronDown, ChevronUp } from "lucide-react";
import { ConsumetEpisode } from "@/types";
import Image from "next/image";

interface EpisodeListProps {
  episodes: ConsumetEpisode[];
  currentEpisodeId?: string;
  onSelectEpisode: (episode: ConsumetEpisode) => void;
  animeTitle?: string;
}

export default function EpisodeList({ episodes, currentEpisodeId, onSelectEpisode, animeTitle }: EpisodeListProps) {
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const INITIAL_COUNT = 24;
  const displayEpisodes = showAll ? episodes : episodes.slice(0, INITIAL_COUNT);
  const hasMore = episodes.length > INITIAL_COUNT;

  if (!episodes.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No episodes available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{episodes.length} Episodes</p>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button onClick={() => setViewMode("grid")} className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "grid" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>Grid</button>
          <button onClick={() => setViewMode("list")} className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>List</button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {displayEpisodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              className={`aspect-square rounded-lg text-sm font-medium transition-all duration-200 ${
                ep.id === currentEpisodeId
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                  : "bg-white/5 hover:bg-purple-600/30 text-gray-300 hover:text-white border border-white/5 hover:border-purple-500/30"
              }`}
            >
              {ep.number}
            </button>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {displayEpisodes.map(ep => (
            <button
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                ep.id === currentEpisodeId
                  ? "bg-purple-600/20 border border-purple-500/40"
                  : "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-[#1a1a35] flex-shrink-0">
                {ep.image ? (
                  <Image src={ep.image} alt={ep.title || `Episode ${ep.number}`} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-600" />
                  </div>
                )}
                {ep.id === currentEpisodeId && (
                  <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${ep.id === currentEpisodeId ? "text-purple-300" : "text-gray-200"}`}>
                  Episode {ep.number}{ep.title ? `: ${ep.title}` : ""}
                </p>
                {ep.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{ep.description}</p>
                )}
              </div>

              {/* Play icon */}
              <Play className={`w-4 h-4 flex-shrink-0 ${ep.id === currentEpisodeId ? "text-purple-400 fill-purple-400" : "text-gray-600"}`} />
            </button>
          ))}
        </div>
      )}

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-purple-400 hover:text-purple-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all"
        >
          {showAll ? (
            <><ChevronUp className="w-4 h-4" /> Show Less</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Show All {episodes.length} Episodes</>
          )}
        </button>
      )}

      {/* animeTitle used to suppress TS warning */}
      <span className="hidden">{animeTitle}</span>
    </div>
  );
}
