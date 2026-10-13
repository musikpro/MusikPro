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
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  // La carte de la chanson en cours reste visible dans le carrousel (centrée) quand on change de piste.
  useEffect(() => {
    const card = cardRefs.current[index];
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

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
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("En écoute")}</span>
        <h2 className="mt-1 line-clamp-2 font-headings text-xl font-bold leading-tight text-foreground">{song.displayTitle ?? song.title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("Communauté MusikPro")}</p>
      </div>

      <div className="flex justify-center py-3">
        <div className="w-48 max-w-full">
          <VinylDisc coverUrl={song.coverUrl} playing={playing} />
        </div>
      </div>

      <div className="flex items-center justify-between pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon i="music-2" size={16} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-medium text-foreground">{song.style ?? ""}</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon i="headphones" size={14} />
          {formatPlays(song.plays)}
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-pressed={muted}
            aria-label={muted ? t("Réactiver le son") : t("Couper le son")}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Icon i={muted ? "volume-x" : "volume-2"} size={16} />
          </button>
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

      <div className="pb-1">
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

      <div className="flex items-center justify-center gap-8 pb-3">
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


      {songs.length > 1 ? (
        <div className="-mx-4 border-t border-border pt-3">
          <div className="mb-3 flex items-baseline justify-between px-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("À écouter")}</p>
            <p className="text-xs text-muted-foreground">
              {translateTemplate("{count} chansons", { count: songs.length })}
            </p>
          </div>
          <div
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1.5"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {songs.map((item, itemIndex) => {
              const active = itemIndex === index;
              return (
                <button
                  key={item.songGroupId}
                  ref={(node) => {
                    cardRefs.current[itemIndex] = node;
                  }}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setPlaying((value) => !value);
                      return;
                    }
                    setIndex(itemIndex);
                    setProgress({ current: 0, duration: 0 });
                    setPlaying(true);
                  }}
                  aria-label={translateTemplate("Écouter {title}", { title: item.title })}
                  aria-current={active ? "true" : undefined}
                  className={`relative aspect-square w-36 shrink-0 snap-center overflow-hidden rounded-2xl text-left transition-transform active:scale-95 ${
                    active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- couverture déjà optimisée côté stockage
                    <img src={item.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="musik-trend-brand-cover h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icon.svg" alt="" />
                    </div>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <span
                    className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full ${
                      active ? "bg-primary text-primary-foreground" : "bg-black/50 text-white"
                    }`}
                  >
                    <Icon i={active && playing ? "pause" : "play"} size={14} />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-2.5">
                    <span className="line-clamp-2 block text-xs font-bold leading-tight text-white">
                      {item.displayTitle ?? item.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75">
                      <Icon i="headphones" size={10} />
                      {formatPlays(item.plays)}
                      {item.style ? <span className="truncate">· {item.style}</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
