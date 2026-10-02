"use client";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { downloadAudioFile, shareAudioFile } from "@/lib/demo/audio-actions";
import { useDemo } from "./DemoProvider";

export const displayName = "Lecteur de chanson";
export const screenSize = "mobile";

import { useEffect, useRef, useState } from "react";
import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";
import Image from "./Image";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function SongPlayerScreen() {
  const demo = useDemo();
  const currentSong = demo.currentSong;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [muted, setMuted] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const isReal = !demo.isDemo;
  const isPending = isReal && currentSong?.status && currentSong.status !== "completed";
  const audioUrl = isReal ? currentSong?.audioUrl : null;
  // Partage et téléchargement sont réservés au compte propriétaire : une chanson de la communauté
  // (Découvrir, Tendances…) reste écoutable mais n'est ni téléchargeable ni partageable par les autres.
  // File « Suivant » : les deux chansons qui suivent la chanson courante dans la bibliothèque, dans l'ordre exact
  // où le bouton « suivant » les parcourt (circulaire), pour que ce qui est affiché soit ce qui sera joué.
  const queue = demo.library;
  const currentIndex = queue.findIndex((song) => song.id === currentSong?.id);
  const upNext = (currentIndex === -1 ? queue : [...queue.slice(currentIndex + 1), ...queue.slice(0, currentIndex)])
    .filter((song) => song.id !== currentSong?.id)
    .slice(0, 2);
  const canExport = !isReal || demo.songs.some((song) => song.id === currentSong?.id);

  // A visitor can land here while the song is still "processing": DemoProvider polls the library until
  // every version is done, so this screen switches to the player by itself, without a reload.

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted, audioUrl]);

  // Each track starts from zero: without this the previous song's duration/position stayed on screen (and
  // the bar sat at a stale value) until the new file's metadata arrived — or forever when the browser's
  // "loadedmetadata" fired before React attached its handler.
  useEffect(() => {
    const audio = audioRef.current;
    const duration = audio && Number.isFinite(audio.duration) ? audio.duration : 0;
    setProgress({ current: audio && duration ? audio.currentTime : 0, duration });
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (demo.playing) audio.play().catch(() => demo.setPlaying(false));
    else audio.pause();
  }, [demo.playing, audioUrl]);

  // Progress bar scrubbing: mouse, finger (touch/pen share pointer events) and keyboard.
  const canSeek = Boolean(audioUrl && progress.duration);
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

  if (!currentSong) {
    return (
      <div className="bg-background flex min-h-full flex-col">
        <MobileTopBar credits={demo.balance} />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <Icon i="music-2" size={38} className="mx-auto mb-3 text-primary" />
            <h1 className="font-headings text-xl font-bold text-foreground">{t("Aucune chanson sélectionnée")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Tes chansons réelles pourront être écoutées ici.")}
            </p>
            <button
              type="button"
              onClick={() => demo.go("/dashboard/songs")}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              {t("Voir mes chansons")}
            </button>
          </div>
        </div>
        <MobileBottomNav activeTab={t("Mes chansons")} />
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col h-full">
      <MobileTopBar credits={demo.balance} />

      {/* Main Player Content */}
      <div className="workspace-player-body flex-1 flex flex-col">
        {/* Now Playing */}
        <div className="px-4 pt-6 pb-4">
          <div className="text-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("En écoute")}
            </span>
          </div>
          <h1 className="font-headings font-bold text-2xl text-foreground text-center">{currentSong.title}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{currentSong.artist}</p>
        </div>

        {/* Album Art */}
        <div className="workspace-album-art px-4 pb-8 flex-1 flex items-center justify-center">
          <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-2xl">
            {currentSong.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
            ) : currentSong.img ? (
              <Image ar="1:1" prompt={currentSong.img} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Icon i="music-2" size={64} className="text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info */}
        <div className="px-4 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon i="music-2" size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">{currentSong.style}</span>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.toggleFavorite(currentSong.id)}
            aria-pressed={demo.favorites.includes(currentSong.id)}
            aria-label={translateTemplate("Favori {title}", { title: currentSong.title })}
            className="flex items-center gap-1.5 text-primary font-semibold"
          >
            <Icon i="heart" size={18} />
            <span className="text-sm">{currentSong.likes}</span>
          </button>
        </div>

        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={(e) => {
              // React nulls out a SyntheticEvent's `currentTarget` once the handler returns, but
              // the functional updater below only runs later when React actually processes the
              // queued state update — reading `e.currentTarget` from inside it crashed with
              // "Cannot read properties of null" the moment this screen became reachable (it was
              // unreachable in the real flow before the generating screen started redirecting
              // here). Reading the value synchronously here, before it's captured by the
              // updater's closure, avoids touching the event after React has released it.
              const current = e.currentTarget.currentTime;
              if (!scrubbingRef.current) setProgress((p) => ({ ...p, current }));
            }}
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
            }}
            onDurationChange={(e) => {
              // Some MP3 streams only report their real length after a few seconds (Infinity/NaN at first).
              const duration = e.currentTarget.duration;
              if (Number.isFinite(duration)) setProgress((p) => ({ ...p, duration }));
            }}
            onEnded={() => {
              // Fin de chanson : on enchaîne sur la suivante de la file ; seule dans la bibliothèque, on s'arrête.
              if (upNext.length > 0) demo.nextSong(1);
              else demo.setPlaying(false);
            }}
            onError={() => {
              demo.setPlaying(false);
              demo.notify(t("Impossible de lire cette chanson pour le moment. Vérifie ta connexion et réessaie."));
            }}
            onStalled={() =>
              demo.notify(t("La lecture est interrompue par une connexion instable. Patiente ou réessaie."))
            }
            className="sr-only"
          />
        ) : null}

        {isPending ? (
          <div className="px-4 pb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Icon i="loader-circle" size={16} className="animate-spin text-primary" />
            {currentSong.status === "failed"
              ? t("La génération de cette version a échoué.")
              : t("Génération en cours…")}
          </div>
        ) : (
          /* Progress Bar */
          <div className="px-4 pb-4">
            <div
              ref={barRef}
              className={`group relative flex h-6 items-center ${canSeek ? "cursor-pointer" : ""}`}
              style={{ touchAction: "none" }}
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
              <div className="bg-border rounded-full h-1 w-full">
                <div
                  className="bg-primary h-1 rounded-full"
                  style={{
                    width:
                      audioUrl && progress.duration
                        ? `${Math.min(100, (progress.current / progress.duration) * 100)}%`
                        : audioUrl
                          ? "0%"
                          : "45%",
                  }}
                />
              </div>
              {canSeek ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow"
                  style={{ left: `${Math.min(100, (progress.current / progress.duration) * 100)}%` }}
                />
              ) : null}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{audioUrl ? formatTime(progress.current) : "1:41"}</span>
              <span>{audioUrl && progress.duration ? formatTime(progress.duration) : currentSong.duration}</span>
            </div>
          </div>
        )}

        {/* Player Controls */}
        <div className="px-4 pb-8 flex items-center justify-center gap-8">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(-1)}
            aria-label={t("Chanson précédente")}
            className="text-muted-foreground"
          >
            <Icon i="skip-back" size={24} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            disabled={Boolean(isPending)}
            onClick={() => {
              if (isReal && !demo.playing && audioUrl) demo.registerPlay(currentSong.id, demo.selectedVersion);
              demo.setPlaying(!demo.playing);
            }}
            aria-label={demo.playing ? t("Mettre en pause") : t("Lire")}
            className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
            style={{ boxShadow: "0 6px 18px rgba(242,101,34,0.35)" }}
          >
            <Icon i={demo.playing ? "pause" : "play"} size={24} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(1)}
            aria-label={t("Chanson suivante")}
            className="text-muted-foreground"
          >
            <Icon i="skip-forward" size={24} />
          </button>
        </div>

        {/* Volume Control */}
        <div className="px-4 pb-6 flex items-center justify-center">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() =>
              audioUrl
                ? setMuted((prev) => !prev)
                : demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true })
            }
            aria-pressed={muted}
            aria-label={muted ? t("Réactiver le son") : t("Couper le son")}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Icon i={muted ? "volume-x" : "volume-2"} size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        {canExport ? (
          <div className="px-4 pb-6 flex items-center justify-center gap-3">
            <button
              type="button"
              data-demo-ready="true"
              disabled={Boolean(isPending)}
              onClick={async () => {
                if (!audioUrl) {
                  demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
                  return;
                }
                const result = await shareAudioFile(audioUrl, currentSong.title);
                if (result === "copied") demo.notify(t("Lien de la chanson copié dans le presse-papiers."));
                if (result === "failed") demo.notify(t("Impossible de partager cette chanson pour le moment."));
              }}
              className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Icon i="share-2" size={16} />
              {t("Partager")}
            </button>
            <button
              type="button"
              data-demo-ready="true"
              disabled={Boolean(isPending)}
              onClick={async () => {
                if (!audioUrl) {
                  demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
                  return;
                }
                const ok = await downloadAudioFile(audioUrl, currentSong.title);
                if (!ok) demo.notify(t("Le téléchargement a échoué. Réessaie dans un instant."));
              }}
              className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Icon i="download" size={16} />
              {t("Télécharger")}
            </button>
          </div>
        ) : null}
      </div>

      {/* Queue/Up Next */}
      <div className="px-4 pb-6 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("Suivant")}</p>
        <div className="space-y-2">
          {upNext.map((song) => {
            // Une chanson sans fichier audio (en mode réel) ne peut pas être jouée.
            const playable = !isReal || Boolean((song as { audioUrl?: string | null }).audioUrl);
            return (
              <button
                key={song.id}
                type="button"
                data-demo-ready="true"
                disabled={!playable}
                onClick={() => demo.selectSong(song.id)}
                aria-label={translateTemplate("Écouter {title}", { title: song.title })}
                className="flex w-full items-center gap-3 p-3 bg-card rounded-xl border border-border/30 text-left transition-colors hover:border-primary/40 active:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon i="play" size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.style}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{song.duration}</span>
              </button>
            );
          })}
          {upNext.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">{t("Aucune autre chanson")}</p>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Découvrir")} />
    </div>
  );
}
