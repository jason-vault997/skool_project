import React, { useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';
import './YouTubePlayer.css';

interface YouTubePlayerProps {
  videoId: string | null;
  startSeconds?: number;
  onProgress?: (percent: number, currentSec: number) => void;
  onComplete?: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

// Load YouTube IFrame API once
let apiLoaded = false;
let apiReady = false;
const pendingCallbacks: (() => void)[] = [];

function loadYouTubeAPI(onReady: () => void) {
  if (apiReady) { onReady(); return; }
  pendingCallbacks.push(onReady);
  if (!apiLoaded) {
    apiLoaded = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      pendingCallbacks.forEach(cb => cb());
      pendingCallbacks.length = 0;
    };
  }
}

const COMPLETE_THRESHOLD = 90; // Mark complete at 90% watched
const PROGRESS_INTERVAL  = 5000; // Save progress every 5 seconds

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  startSeconds = 0,
  onProgress,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<YTPlayer | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const clearProgressInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    clearProgressInterval();
    intervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getCurrentTime();
      const duration = player.getDuration();
      if (!duration || duration <= 0) return;
      const pct = Math.round((current / duration) * 100);
      onProgress?.(pct, Math.round(current));
      if (pct >= COMPLETE_THRESHOLD && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, PROGRESS_INTERVAL);
  }, [clearProgressInterval, onProgress, onComplete]);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !videoId) return;
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    completedRef.current = false;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        rel: 0,
        modestbranding: 1,
        start: startSeconds,
      },
      events: {
        onReady: ({ target }) => {
          if (startSeconds > 0) target.seekTo(startSeconds, true);
        },
        onStateChange: ({ data }) => {
          const state = window.YT.PlayerState;
          if (data === state.PLAYING) {
            startProgressTracking();
          } else {
            clearProgressInterval();
            // Save progress on pause/end
            const player = playerRef.current;
            if (player) {
              const current = player.getCurrentTime();
              const duration = player.getDuration();
              if (duration > 0) {
                onProgress?.(Math.round((current / duration) * 100), Math.round(current));
              }
            }
          }
        },
      },
    });
  }, [videoId, startSeconds, startProgressTracking, clearProgressInterval, onProgress]);

  useEffect(() => {
    if (!videoId) return;
    loadYouTubeAPI(() => initPlayer());
    return () => {
      clearProgressInterval();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, initPlayer, clearProgressInterval]);

  if (!videoId) {
    return (
      <div className="yt-placeholder">
        <div className="yt-placeholder-inner">
          <div className="yt-placeholder-icon">
            <Play size={32} />
          </div>
          <p className="yt-placeholder-text">Video coming soon</p>
          <p className="yt-placeholder-sub">This lesson will be available once the video is linked.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="yt-wrapper">
      <div ref={containerRef} className="yt-iframe-target" />
    </div>
  );
};
