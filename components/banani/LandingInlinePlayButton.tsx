"use client";

import { useRef, useState, type RefObject } from "react";
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
  /** Nom accessible de la barre de lecture (cartes de la bibliothèque). */
  seek?: string;
};

export default function LandingInlinePlayButton({
  labels,
  audioUrl,
  title,
  compact = false,
  className = "",
  onPlayingChange,
  audioRef: externalAudioRef,
  preload = "none",
  onAudioUpdate,
}: {
  labels: LandingPlayLabels;
  audioUrl: string;
  title: string;
  compact?: boolean;
  className?: string;
  /** Lets the card around the button react (e.g. show a mini visualizer) while the song plays. */
  onPlayingChange?: (playing: boolean) => void;
  /** Donne à la carte l'accès à l'élément audio (déplacement dans la chanson). */
  audioRef?: RefObject<HTMLAudioElement | null>;
  preload?: "none" | "metadata";
  /** Appelé à chaque avancée de lecture ou chargement de la durée (barre de progression de la carte). */
  onAudioUpdate?: (audio: HTMLAudioElement) => void;
}) {
  const ownAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef ?? ownAudioRef;
  const notify = (event: React.SyntheticEvent<HTMLAudioElement>) => onAudioUpdate?.(event.currentTarget);
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
        preload={preload}
        onTimeUpdate={notify}
        onLoadedMetadata={notify}
        onDurationChange={notify}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(event) => {
          setPlaying(false);
          notify(event);
        }}
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
