"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Icon from "./Icon";
import LandingInlinePlayButton, { type LandingPlayLabels } from "./LandingInlinePlayButton";
import type { LandingFeaturedSong } from "@/lib/landing-features/server";

const BAR_COUNT = 24;

/** Hauteurs (22–100 %) dérivées du slug : le relief de la barre est propre à chaque chanson et stable d'un rendu à l'autre. */
function barHeights(seed: string): number[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    state = Math.imul(state ^ (state >>> 13), 1274126177) >>> 0;
    const envelope = 0.55 + 0.45 * Math.sin((index / (BAR_COUNT - 1)) * Math.PI);
    return Math.round(22 + (state % 1000) * 0.078 * envelope);
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * One card of the landing "Bibliothèque populaire": cover, title, play count and a real audio player —
 * the "Écouter" button plus a bar strip that fills as the song plays and can be clicked, dragged or
 * moved with the arrow keys to seek. `size` only switches between the mobile and desktop proportions.
 * The whole card opens the song page through a stretched link; the player controls sit above it.
 */
export default function LandingLibraryCard({
  song,
  size,
  labels,
}: {
  song: LandingFeaturedSong;
  size: "sm" | "lg";
  labels: LandingPlayLabels;
}) {
  const large = size === "lg";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const heights = barHeights(song.slug);
  const ratio = time.duration > 0 ? Math.min(1, time.current / time.duration) : 0;
  const filled = Math.round(ratio * BAR_COUNT);
  const detail = [song.style, song.occasion].filter(Boolean).join(" · ");

  const seekTo = (next: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, next));
    setTime({ current: audio.currentTime, duration: audio.duration });
  };
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = stripRef.current?.getBoundingClientRect();
    const audio = audioRef.current;
    if (!rect || !audio || !Number.isFinite(audio.duration)) return;
    seekTo(((event.clientX - rect.left) / rect.width) * audio.duration);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") seekTo(audio.currentTime + 5);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") seekTo(audio.currentTime - 5);
    else return;
    event.preventDefault();
  };

  return (
    <article
      className={`landing-library-card ${playing ? "is-playing" : ""} ${large ? "is-large" : ""}`}
      data-size={size}
    >
      <div className="landing-library-top">
        <div className="landing-library-cover">
          {song.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.coverUrl} alt="" draggable={false} />
          ) : (
            <span className="landing-icon-gradient landing-library-cover-fallback">
              <Icon i="music-2" size={large ? 24 : 20} className="text-white" />
            </span>
          )}
        </div>
        <div className="landing-library-text">
          <Link href={`/s/${song.slug}`} className="landing-library-title">
            {song.title}
          </Link>
          {detail ? <p className="landing-library-detail">{detail}</p> : null}
        </div>
      </div>

      {song.audioUrl ? (
        <div className="landing-library-player">
          <div
            ref={stripRef}
            className="landing-library-strip"
            role="slider"
            tabIndex={0}
            aria-label={labels.seek ?? song.title}
            aria-valuemin={0}
            aria-valuemax={Math.round(time.duration) || 0}
            aria-valuenow={Math.round(time.current)}
            aria-valuetext={`${formatTime(time.current)} / ${formatTime(time.duration)}`}
            onKeyDown={onKeyDown}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event);
            }}
          >
            {heights.map((height, index) => (
              <span key={index} className={index < filled ? "is-filled" : undefined} style={{ height: `${height}%` }} />
            ))}
          </div>
          <span className="landing-library-time">
            {time.duration > 0 ? `${formatTime(time.current)} / ${formatTime(time.duration)}` : " "}
          </span>
          <LandingInlinePlayButton
            labels={labels}
            audioUrl={song.audioUrl}
            title={song.title}
            compact
            preload="metadata"
            audioRef={audioRef}
            onAudioUpdate={(audio) =>
              setTime({ current: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
            }
            onPlayingChange={setPlaying}
          />
        </div>
      ) : null}
    </article>
  );
}
