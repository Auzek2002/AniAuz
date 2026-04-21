"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Hls from "hls.js";
import { StreamData } from "@/types";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, SkipBack, SkipForward, Loader2, Subtitles } from "lucide-react";

interface VideoPlayerProps {
  streamData: StreamData | null;
  loading?: boolean;
  onEnded?: () => void;
  title?: string;
}

export default function VideoPlayer({ streamData, loading, onEnded, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("default");
  const [showQuality, setShowQuality] = useState(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0); // 0 = first sub, -1 = off

  const subtitles = useMemo(() => {
    return (streamData?.subtitles || []).filter(s => s.lang?.toLowerCase() !== "thumbnails");
  }, [streamData]);

  const displaySources = useMemo(() => {
    const sources = streamData?.sources || [];
    const m3u8Sources = sources.filter(s => s.isM3U8 || s.url.includes(".m3u8"));
    return m3u8Sources.length > 0 ? m3u8Sources : sources;
  }, [streamData]);

  // Apply subtitle track selection to the video element
  const applySubtitleTrack = useCallback((idx: number) => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === idx ? "showing" : "hidden";
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current || !streamData || !displaySources[selectedSource]) return;

    const video = videoRef.current;
    const src = displaySources[selectedSource].url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const playVideo = () => {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    const referer = streamData?.headers?.Referer || "";
    const proxySrc = src.includes(".m3u8")
      ? `/api/proxy?url=${encodeURIComponent(src)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`
      : src;

    if (src.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: (xhr) => { xhr.withCredentials = false; },
      });
      hlsRef.current = hls;
      hls.loadSource(proxySrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) console.error("HLS fatal error:", data.type);
      });
    } else {
      video.src = proxySrc;
      video.addEventListener("loadedmetadata", playVideo, { once: true });
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamData, selectedSource]);

  // Reset state when new stream data arrives
  useEffect(() => {
    setSelectedSource(0);
    // Default to first English sub, or first available
    const subs = (streamData?.subtitles || []).filter(s => s.lang?.toLowerCase() !== "thumbnails");
    const engIdx = subs.findIndex(s => s.lang?.toLowerCase().includes("english"));
    setSelectedSubIdx(engIdx >= 0 ? engIdx : subs.length > 0 ? 0 : -1);
  }, [streamData]);

  // Apply subtitle selection whenever tracks load or selection changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // textTracks may not be populated until the video loads; listen for cuechange/load
    const apply = () => applySubtitleTrack(selectedSubIdx);
    apply();
    video.addEventListener("loadedmetadata", apply);
    return () => video.removeEventListener("loadedmetadata", apply);
  }, [selectedSubIdx, applySubtitleTrack, streamData]);

  useEffect(() => {
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, []);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  };

  const seek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const changeVolume = (v: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const selectSub = (idx: number) => {
    setSelectedSubIdx(idx);
    applySubtitleTrack(idx);
    setShowSubMenu(false);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="video-container group bg-black rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onMouseEnter={resetControlsTimer}
    >
      {/* Video element with subtitle tracks */}
      <video
        ref={videoRef}
        className="w-full h-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onEnded={onEnded}
        onClick={togglePlay}
        playsInline
      >
        {subtitles.map((sub, i) => (
          <track
            key={`${sub.url}-${i}`}
            kind="subtitles"
            src={`/api/proxy?url=${encodeURIComponent(sub.url)}${streamData?.headers?.Referer ? `&referer=${encodeURIComponent(streamData.headers.Referer)}` : ""}`}
            label={sub.lang}
            srcLang={(sub.lang || "").slice(0, 2).toLowerCase()}
            default={i === selectedSubIdx}
          />
        ))}
      </video>

      {/* Loading overlay */}
      {(loading || buffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            <p className="text-sm text-gray-300">{loading ? "Loading stream..." : "Buffering..."}</p>
          </div>
        </div>
      )}

      {/* No source */}
      {!loading && !streamData && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14]">
          <div className="text-center space-y-2">
            <Play className="w-16 h-16 text-gray-600 mx-auto" />
            <p className="text-gray-400 text-sm">Select an episode to start watching</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {!loading && streamData && (
        <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="relative px-4 pb-4 pt-8 space-y-2">
            {title && <p className="text-xs text-gray-300 truncate hidden sm:block">{title}</p>}

            {/* Progress bar */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={e => seek(Number(e.target.value))}
              className="w-full h-1 appearance-none cursor-pointer accent-purple-500 bg-white/20 rounded-full"
              style={{
                background: `linear-gradient(to right, #7c3aed ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />

            <div className="flex items-center justify-between gap-4">
              {/* Left controls */}
              <div className="flex items-center gap-2">
                <button onClick={() => seek(currentTime - 10)} className="p-1.5 text-gray-300 hover:text-white transition-colors">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} className="p-1.5 text-white hover:text-purple-300 transition-colors">
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button onClick={() => seek(currentTime + 10)} className="p-1.5 text-gray-300 hover:text-white transition-colors">
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button onClick={toggleMute} className="p-1.5 text-gray-300 hover:text-white transition-colors">
                    {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={e => changeVolume(Number(e.target.value))}
                    className="w-16 h-1 appearance-none cursor-pointer accent-purple-500 hidden group-hover/vol:block sm:block"
                    style={{ background: `linear-gradient(to right, #7c3aed ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)` }}
                  />
                </div>

                <span className="text-xs text-gray-300 hidden sm:block">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2">
                {/* Subtitle selector */}
                {subtitles.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowSubMenu(!showSubMenu); setShowQuality(false); }}
                      className={`flex items-center gap-1 p-1.5 transition-colors text-xs ${selectedSubIdx >= 0 ? "text-purple-300" : "text-gray-300 hover:text-white"}`}
                      title="Subtitles"
                    >
                      <Subtitles className="w-4 h-4" />
                      <span className="hidden sm:block">{selectedSubIdx >= 0 ? subtitles[selectedSubIdx]?.lang : "Off"}</span>
                    </button>
                    {showSubMenu && (
                      <div className="absolute bottom-full right-0 mb-2 glass rounded-lg overflow-hidden shadow-xl min-w-[130px]">
                        <button
                          onClick={() => selectSub(-1)}
                          className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${selectedSubIdx === -1 ? "text-purple-400 bg-purple-600/20" : "text-gray-300 hover:bg-white/5"}`}
                        >
                          Off
                        </button>
                        {subtitles.map((sub, i) => (
                          <button
                            key={i}
                            onClick={() => selectSub(i)}
                            className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${i === selectedSubIdx ? "text-purple-400 bg-purple-600/20" : "text-gray-300 hover:bg-white/5"}`}
                          >
                            {sub.lang}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quality selector */}
                {displaySources.length > 1 && (
                  <div className="relative">
                    <button onClick={() => { setShowQuality(!showQuality); setShowSubMenu(false); }} className="flex items-center gap-1 p-1.5 text-gray-300 hover:text-white transition-colors text-xs">
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:block">{displaySources[selectedSource]?.quality || "Auto"}</span>
                    </button>
                    {showQuality && (
                      <div className="absolute bottom-full right-0 mb-2 glass rounded-lg overflow-hidden shadow-xl min-w-[100px]">
                        {displaySources.map((s, i) => (
                          <button key={i} onClick={() => { setSelectedSource(i); setSelectedQuality(s.quality || "Auto"); setShowQuality(false); }}
                            className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${i === selectedSource ? "text-purple-400 bg-purple-600/20" : "text-gray-300 hover:bg-white/5"}`}>
                            {s.quality}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={toggleFullscreen} className="p-1.5 text-gray-300 hover:text-white transition-colors">
                  {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* suppress unused warning */}
      <span className="hidden">{selectedQuality}</span>
    </div>
  );
}
