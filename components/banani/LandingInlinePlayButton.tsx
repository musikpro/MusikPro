"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";

// Module-scope (not React state) on purpose: only one inline preview should ever play at a time
// across the whole landing page, and cards are plain, independent instances of this component —
// no shared provider is mounted above them (unlike the single persistent AmbientPlayerContext
// track on /dashboard, these are short user-initiated previews scoped to whichever viewport tree
// is actually visible).
let stopActive: (() => void) | null = null;

export type LandingPlayLabels = {
  listen: string;
  /** Contient le marqueur {title}, remplacé par le titre de la chanson (jamais traduit). */
  listenTitle: string;
  playing: string;
  pause: string;
};

export default function LandingInlinePlayButton({
  labels,
  audioUrl,
  title,
  compact = false,
  className = "",
  onPlayingChange,
}: {
  labels: LandingPlayLabels;
  audioUrl: string;
  title: string;
  compact?: boolean;
  className?: string;
  /** Lets the card around the button react (e.g. show a mini visualizer) while the song plays. */
  onPlayingChange?: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlayingState] = useState(false);
  const setPlaying = (value: boolean) => {
    setPlayingState(value);
    onPlayingChange?.(value);
  };

  const stop = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const toggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      stop();
      return;
    }
    if (stopActive && stopActive !== stop) stopActive();
    stopActive = stop;
    void audio.play().catch(() => {});
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setPlaying(false)}
        className="sr-only"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? labels.pause : labels.listenTitle.replace("{title}", title)}
        className={`cta-glow landing-inline-play ${compact ? "is-compact" : ""} ${playing ? "is-playing" : ""} ${className}`}
      >
        <Icon i={playing ? "pause" : "play"} size={compact ? 14 : 18} />
        <span className="landing-inline-play-label">{playing ? labels.playing : labels.listen}</span>
      </button>
    </>
  );
}
