"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import VinylDisc from "@/components/ui/vinyl-disc";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { formatPlays } from "@/lib/trending/format";
import type { DiscoverSong } from "@/lib/discover/types";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Lecteur vinyle du visiteur invité : même rendu que l'écran « En écoute » du compte (disque qui tourne, pochette
 * au centre, barre de progression, précédent/lecture/suivant), mais alimenté par la bibliothèque partagée et sans
 * aucune donnée de compte. La lecture démarre dès l'arrivée et enchaîne sur la chanson suivante.
 */
export default function GuestVinylPlayer({ songs }: { songs: DiscoverSong[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const song = songs[index] ?? null;
  const upNext = songs.length > 1 ? [1, 2].map((offset) => songs[(index + offset) % songs.length]).filter((s) => s !== song) : [];

  const go = (direction: number) => {
    if (!songs.length) return;
    setIndex((current) => (current + direction + songs.length) % songs.length);
    setProgress({ current: 0, duration: 0 });
    setPlaying(true);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, song]);

  if (!song) return null;

  const canSeek = progress.duration > 0;
  const seekFromPointer = (clientX: number) => {
    const audio = audioRef.current;
    const rect = barRef.current?.getBoundingClientRect();
    if (!audio || !rect || !rect.width || !canSeek) return;
    const next = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * progress.duration;
    audio.currentTime = next;
    setProgress((p) => ({ ...p, current: next }));
  };
  const percent = canSeek ? Math.min(100, (progress.current / progress.duration) * 100) : 0;

  return (
    <section aria-label={t("En écoute")} className="px-4">
      <div className="pt-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("En écoute")}</span>
        <h2 className="mt-2 font-headings text-2xl font-bold text-foreground">{song.displayTitle ?? song.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("Communauté MusikPro")}</p>
      </div>

      <div className="flex justify-center py-6">
        <div className="w-64 max-w-full">
          <VinylDisc coverUrl={song.coverUrl} playing={playing} />
        </div>
      </div>

      <div className="flex items-center justify-between pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon i="music-2" size={16} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-medium text-foreground">{song.style ?? ""}</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon i="headphones" size={14} />
          {formatPlays(song.plays)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={song.audioUrl}
        className="sr-only"
        onTimeUpdate={(e) => {
          // Lire la valeur ici : React libère `currentTarget` dès le retour du gestionnaire, avant l'exécution du updater.
          const current = e.currentTarget.currentTime;
          setProgress((p) => ({ ...p, current }));
        }}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget.duration;
          if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
        }}
        onDurationChange={(e) => {
          const duration = e.currentTarget.duration;
          if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
        }}
        onEnded={() => (songs.length > 1 ? go(1) : setPlaying(false))}
        onError={() => setPlaying(false)}
      />

      <div className="pb-4">
        <div
          ref={barRef}
          role="slider"
          aria-label={t("Position de lecture")}
          aria-valuemin={0}
          aria-valuemax={Math.round(progress.duration) || 0}
          aria-valuenow={Math.round(progress.current)}
          aria-valuetext={translateTemplate("{current} sur {duration}", {
            current: formatTime(progress.current),
            duration: formatTime(progress.duration),
          })}
          aria-disabled={!canSeek}
          tabIndex={canSeek ? 0 : -1}
          className={`relative flex h-6 items-center ${canSeek ? "cursor-pointer" : ""}`}
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromPointer(e.clientX);
          }}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !canSeek) return;
            if (e.key === "ArrowRight") audio.currentTime = Math.min(progress.duration, audio.currentTime + 5);
            else if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
            else return;
            e.preventDefault();
          }}
        >
          <div className="h-1 w-full rounded-full bg-border">
            <div className="h-1 rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          {canSeek ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow"
              style={{ left: `${percent}%` }}
            />
          ) : null}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(progress.current)}</span>
          <span>{formatTime(progress.duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 pb-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("Chanson précédente")}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <Icon i="skip-back" size={24} />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? t("Mettre en pause") : t("Lire")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
          style={{ boxShadow: "0 6px 18px rgba(242,101,34,0.35)" }}
        >
          <Icon i={playing ? "pause" : "play"} size={24} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("Chanson suivante")}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <Icon i="skip-forward" size={24} />
        </button>
      </div>

      <div className="flex justify-center pb-5">
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          aria-label={muted ? t("Réactiver le son") : t("Couper le son")}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <Icon i={muted ? "volume-x" : "volume-2"} size={18} />
        </button>
      </div>

      {upNext.length ? (
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Suivant")}</p>
          <div className="space-y-2">
            {upNext.map((next) => (
              <button
                key={next.songGroupId}
                type="button"
                onClick={() => {
                  setIndex(songs.indexOf(next));
                  setProgress({ current: 0, duration: 0 });
                  setPlaying(true);
                }}
                aria-label={translateTemplate("Écouter {title}", { title: next.title })}
                className="flex w-full items-center gap-3 rounded-xl border border-border/30 bg-card p-3 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon i="play" size={14} className="text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {next.displayTitle ?? next.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{next.style ?? ""}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
