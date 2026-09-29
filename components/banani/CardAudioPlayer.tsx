"use client";
import { useEffect, useRef, useState } from "react";
import { translate as t } from "@/lib/i18n/translate";
import Icon from "./Icon";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

const EQ_BARS = 24;

/**
 * The one internal card player of the whole product — used by the "Tendances" cards of the client
 * dashboard and by the landing "Ils ont créé avec MusikPro" carousel. It is rendered INSIDE the
 * card that was tapped — the card itself turns into the player (dark overlay over its
 * cover, animated audio visualizer, play/pause, seek bar) instead of a second player being added
 * above the list. It plays the published MP3 right in the dashboard, never the public /s/[slug]
 * page in another tab, and starts on mount (the tap on the card is the user gesture that allows
 * autoplay). Duration and position are read straight from the <audio> element and refreshed on a
 * timer, not only from media events — mobile browsers can drop or throttle them. The visualizer
 * is a CSS animation that runs only while the audio plays (a real analyser would need CORS on the
 * audio host).
 */
export default function CardAudioPlayer({
  title,
  audioUrl,
  onClose,
  compact = false,
}: {
  title: string;
  audioUrl: string;
  onClose: () => void;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  function syncDuration() {
    const value = audioRef.current?.duration;
    if (value && Number.isFinite(value) && value > 0) setDuration((prev) => (prev === value ? prev : value));
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setPlaying(false));
  }, [audioUrl]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      syncDuration();
      if (!scrubbingRef.current) setCurrentTime(audio.currentTime);
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  const seek = (value: number) => {
    setCurrentTime(value);
    if (audioRef.current) audioRef.current.currentTime = value;
  };
  const endScrub = () => {
    scrubbingRef.current = false;
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-between bg-black/90 p-3 text-white"
      role="region"
      aria-label={t("Lecteur de tendance")}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => {
          if (!scrubbingRef.current) setCurrentTime(event.currentTarget.currentTime);
          syncDuration();
        }}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onCanPlay={syncDuration}
        className="sr-only"
      />
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 font-bold leading-tight ${compact ? "line-clamp-2 text-xs" : "truncate text-sm"}`}>{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Fermer le lecteur")}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/15"
        >
          <Icon i="x" size={14} className="text-white" />
        </button>
      </div>
      <div className={`trend-eq ${playing ? "is-playing" : ""}`} aria-hidden="true">
        {Array.from({ length: EQ_BARS }, (_, index) => (
          <span key={index} style={{ animationDelay: `${(index * 97) % 700}ms`, animationDuration: `${520 + ((index * 53) % 420)}ms` }} />
        ))}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? t("Pause") : t("Lecture")}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary"
          >
            <Icon i={playing ? "pause" : "play"} size={15} className="text-primary-foreground" />
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            onPointerDown={() => {
              scrubbingRef.current = true;
            }}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onBlur={endScrub}
            aria-label={t("Position dans la chanson")}
            className="h-2 min-w-0 flex-1 cursor-pointer"
            style={{ accentColor: "var(--color-primary)" }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
