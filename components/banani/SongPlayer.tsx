"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";
import SongCarousel, { type CarouselSong } from "./SongCarousel";
import VinylDisc from "@/components/ui/vinyl-disc";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export type SongPlayerProps = {
  title: string;
  subtitle: string;
  coverUrl: string | null;
  /** Fichier audio ; `null` en démonstration (le lecteur reste affiché, sans son). */
  audioUrl: string | null;
  style: string;
  /** Zone à droite de la ligne d'infos (écoutes pour l'invité, favori pour le compte). */
  infoRight: ReactNode;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onPrevious: () => void;
  /** Aussi appelé à la fin d'une chanson ; absent = la lecture s'arrête à la fin. */
  onNext?: () => void;
  /** Version en cours de génération ou échouée : remplace la barre de progression et bloque la lecture. */
  pending?: { failed: boolean } | null;
  /** Temps affichés quand il n'y a pas de fichier audio (démonstration). */
  idleTimes?: { elapsed: string; total: string };
  /** Appelé juste avant de démarrer la lecture avec le gros bouton (ex. comptage d'écoute). */
  onPlayRequested?: () => void;
  onAudioError?: () => void;
  onAudioStalled?: () => void;
  /** Bouton « son » sans fichier audio (démonstration) : remplace la bascule. */
  onMuteWithoutAudio?: () => void;
  /** Contenu sous les commandes (ex. Partager / Télécharger). */
  extras?: ReactNode;
  carousel: { songs: CarouselSong[]; activeIndex: number; onSelect: (index: number) => void };
};

/**
 * Lecteur de musique commun (disque vinyle qui tourne, barre de progression déplaçable, précédent / lecture / suivant,
 * son, carrousel « À écouter »). Utilisé par le lecteur du visiteur invité et par celui du tableau de bord client : tout
 * changement de design du lecteur se fait ici, une seule fois. Il ne connaît ni compte ni bibliothèque : l'appelant
 * fournit la chanson, l'état de lecture et les actions.
 */
export default function SongPlayer({
  title,
  subtitle,
  coverUrl,
  audioUrl,
  style,
  infoRight,
  playing,
  onPlayingChange,
  onPrevious,
  onNext,
  pending,
  idleTimes,
  onPlayRequested,
  onAudioError,
  onAudioStalled,
  onMuteWithoutAudio,
  extras,
  carousel,
}: SongPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted, audioUrl]);

  // Chaque piste repart de zéro : sans cela, la durée/position de la chanson précédente restait affichée.
  useEffect(() => {
    const audio = audioRef.current;
    const duration = audio && Number.isFinite(audio.duration) ? audio.duration : 0;
    setProgress({ current: audio && duration ? audio.currentTime : 0, duration });
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (playing) audio.play().catch(() => onPlayingChange(false));
    else audio.pause();
    // Volontaire : relancer seulement si l'état de lecture ou la piste change (pas à chaque rendu de l'appelant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, audioUrl]);

  const canSeek = Boolean(audioUrl && progress.duration);
  const percent = canSeek ? Math.min(100, (progress.current / progress.duration) * 100) : 0;
  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !progress.duration) return;
    const next = Math.min(progress.duration, Math.max(0, seconds));
    audio.currentTime = next;
    setProgress((p) => ({ ...p, current: next }));
  };
  const seekFromPointer = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    seekTo(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * progress.duration);
  };

  return (
    <section aria-label={t("En écoute")} className="mx-auto w-full max-w-md px-4 pb-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("En écoute")}</span>
        <h2 className="mt-1 line-clamp-2 font-headings text-xl font-bold leading-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex justify-center py-3">
        <div className="w-48 max-w-full">
          <VinylDisc coverUrl={coverUrl} playing={playing && Boolean(audioUrl)} />
        </div>
      </div>

      <div className="flex items-center justify-between pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon i="music-2" size={16} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-medium text-foreground">{style}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {infoRight}
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => (audioUrl || !onMuteWithoutAudio ? setMuted((value) => !value) : onMuteWithoutAudio())}
            aria-pressed={muted}
            aria-label={muted ? t("Réactiver le son") : t("Couper le son")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Icon i={muted ? "volume-x" : "volume-2"} size={16} />
          </button>
        </div>
      </div>

      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          className="sr-only"
          onTimeUpdate={(e) => {
            // Lire la valeur ici : React libère `currentTarget` dès le retour du gestionnaire, avant l'exécution du updater.
            const current = e.currentTarget.currentTime;
            if (!scrubbingRef.current) setProgress((p) => ({ ...p, current }));
          }}
          onLoadedMetadata={(e) => {
            const duration = e.currentTarget.duration;
            if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
          }}
          onDurationChange={(e) => {
            // Certains flux MP3 ne donnent leur vraie durée qu'après quelques secondes (Infinity/NaN au début).
            const duration = e.currentTarget.duration;
            if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
          }}
          onEnded={() => (onNext ? onNext() : onPlayingChange(false))}
          onError={() => {
            onPlayingChange(false);
            onAudioError?.();
          }}
          onStalled={() => onAudioStalled?.()}
        />
      ) : null}

      {pending ? (
        <div className="flex items-center justify-center gap-2 pb-3 text-sm text-muted-foreground">
          <Icon i="loader-circle" size={16} className="animate-spin text-primary" />
          {pending.failed ? t("La génération de cette version a échoué.") : t("Génération en cours…")}
        </div>
      ) : (
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
              if (!canSeek) return;
              scrubbingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekFromPointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (scrubbingRef.current) seekFromPointer(e.clientX);
            }}
            onPointerUp={(e) => {
              scrubbingRef.current = false;
              if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              scrubbingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (!canSeek) return;
              const step = e.shiftKey ? 15 : 5;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") seekTo(progress.current + step);
              else if (e.key === "ArrowLeft" || e.key === "ArrowDown") seekTo(progress.current - step);
              else if (e.key === "Home") seekTo(0);
              else if (e.key === "End") seekTo(progress.duration);
              else return;
              e.preventDefault();
            }}
          >
            <div className="h-1 w-full rounded-full bg-border">
              <div className="h-1 rounded-full bg-primary" style={{ width: audioUrl ? `${percent}%` : "45%" }} />
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
            <span>{audioUrl ? formatTime(progress.current) : (idleTimes?.elapsed ?? "0:00")}</span>
            <span>{audioUrl ? formatTime(progress.duration) : (idleTimes?.total ?? "0:00")}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-8 pb-3">
        <button
          type="button"
          data-demo-ready="true"
          onClick={onPrevious}
          aria-label={t("Chanson précédente")}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <Icon i="skip-back" size={24} />
        </button>
        <button
          type="button"
          data-demo-ready="true"
          disabled={Boolean(pending)}
          onClick={() => {
            if (!playing) onPlayRequested?.();
            onPlayingChange(!playing);
          }}
          aria-label={playing ? t("Mettre en pause") : t("Lire")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          style={{ boxShadow: "0 6px 18px rgba(242,101,34,0.35)" }}
        >
          <Icon i={playing ? "pause" : "play"} size={24} />
        </button>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => (onNext ? onNext() : undefined)}
          aria-label={t("Chanson suivante")}
          className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        >
          <Icon i="skip-forward" size={24} />
        </button>
      </div>

      {extras}

      <SongCarousel
        songs={carousel.songs}
        activeIndex={carousel.activeIndex}
        playing={playing}
        onSelect={carousel.onSelect}
        onToggleActive={() => onPlayingChange(!playing)}
      />
    </section>
  );
}
