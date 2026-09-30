"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import LandingInlinePlayButton, { type LandingPlayLabels } from "./LandingInlinePlayButton";
import type { LandingFeaturedSong } from "@/lib/landing-features/server";

const BARS = 5;

/**
 * One row of the landing "Bibliothèque populaire": the song, its play count and the "Écouter" button.
 * While the song plays, a small audio visualizer (the same animated bars as the card player) appears
 * in the row. `size` only switches between the mobile and desktop proportions.
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
  const [playing, setPlaying] = useState(false);
  const large = size === "lg";
  return (
    <Link
      href={`/s/${song.slug}`}
      className={`landing-card-hover landing-library-card bg-card border border-border rounded-xl flex items-center ${large ? "p-4 gap-4" : "p-3 gap-3"}`}
    >
      <div
        className={`landing-icon-gradient rounded-lg flex items-center justify-center flex-shrink-0 ${large ? "w-12 h-12" : "w-10 h-10"}`}
      >
        <Icon i="music-2" size={large ? 22 : 18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-foreground truncate ${large ? "text-base" : "text-sm"}`}>{song.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Icon i="headphones" size={large ? 11 : 10} /> {song.plays}
          </span>
          {playing ? (
            <span className="landing-mini-eq" aria-hidden="true">
              {Array.from({ length: BARS }, (_, index) => (
                <span
                  key={index}
                  style={{ animationDelay: `${index * 110}ms`, animationDuration: `${480 + index * 70}ms` }}
                />
              ))}
            </span>
          ) : null}
        </div>
      </div>
      {song.audioUrl ? (
        <LandingInlinePlayButton
          labels={labels}
          audioUrl={song.audioUrl}
          title={song.title}
          compact
          className="flex-shrink-0"
          onPlayingChange={setPlaying}
        />
      ) : null}
    </Link>
  );
}
