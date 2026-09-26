"use client";
import { translate as t } from "@/lib/i18n/translate";
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
  const isReal = !demo.isDemo;
  const isPending = isReal && currentSong?.status && currentSong.status !== "completed";
  const audioUrl = isReal ? currentSong?.audioUrl : null;

  // A visitor can land here (e.g. redirected straight from the generating screen) while the
  // song is still "processing" — without this, the screen would freeze on "Génération en
  // cours…" forever, since nothing else polls while this screen is mounted. Mirrors the same
  // pattern already used on the songs list (MySongsGeneratedScreen).
  useEffect(() => {
    if (demo.isDemo || currentSong?.status !== "processing") return;
    const timer = window.setInterval(() => void demo.refreshSongs(), 4000);
    return () => window.clearInterval(timer);
  }, [demo, currentSong?.status]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (demo.playing) audio.play().catch(() => demo.setPlaying(false));
    else audio.pause();
  }, [demo.playing, audioUrl]);

  if (!currentSong) {
    return (
      <div className="bg-background flex min-h-full flex-col">
        <MobileTopBar credits={demo.balance} />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <Icon i="music-2" size={38} className="mx-auto mb-3 text-primary" />
            <h1 className="font-headings text-xl font-bold text-foreground">Aucune chanson sélectionnée</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tes chansons réelles pourront être écoutées ici.</p>
            <button
              type="button"
              onClick={() => demo.go("/dashboard/songs")}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Voir mes chansons
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
            {currentSong.img ? (
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
            aria-label={`Favori ${currentSong.title}`}
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
              setProgress((p) => ({ ...p, current }));
            }}
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              setProgress((p) => ({ ...p, duration }));
            }}
            onEnded={() => demo.setPlaying(false)}
            onError={() => {
              demo.setPlaying(false);
              demo.notify("Impossible de lire cette chanson pour le moment. Vérifie ta connexion et réessaie.");
            }}
            onStalled={() =>
              demo.notify("La lecture est interrompue par une connexion instable. Patiente ou réessaie.")
            }
            className="sr-only"
          />
        ) : null}

        {isPending ? (
          <div className="px-4 pb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Icon i="loader-circle" size={16} className="animate-spin text-primary" />
            {currentSong.status === "failed" ? "La génération de cette version a échoué." : "Génération en cours…"}
          </div>
        ) : (
          /* Progress Bar */
          <div className="px-4 pb-4">
            <div className="bg-border rounded-full h-1 mb-2">
              <div
                className="bg-primary h-1 rounded-full"
                style={{
                  width:
                    audioUrl && progress.duration
                      ? `${Math.min(100, (progress.current / progress.duration) * 100)}%`
                      : "45%",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{audioUrl ? formatTime(progress.current) : "1:41"}</span>
              <span>{currentSong.duration}</span>
            </div>
          </div>
        )}

        {/* Player Controls */}
        <div className="px-4 pb-8 flex items-center justify-center gap-8">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(-1)}
            aria-label="Chanson précédente"
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
            aria-label={demo.playing ? "Mettre en pause" : "Lire"}
            className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
            style={{ boxShadow: "0 6px 18px rgba(242,101,34,0.35)" }}
          >
            <Icon i={demo.playing ? "pause" : "play"} size={24} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(1)}
            aria-label="Chanson suivante"
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
                : demo.notify("Action de démonstration : aucune opération réelle effectuée.")
            }
            aria-pressed={muted}
            aria-label={muted ? "Réactiver le son" : "Couper le son"}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Icon i={muted ? "volume-x" : "volume-2"} size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-6 flex items-center justify-center gap-3">
          <button
            type="button"
            data-demo-ready="true"
            disabled={Boolean(isPending)}
            onClick={async () => {
              if (!audioUrl) {
                demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                return;
              }
              const result = await shareAudioFile(audioUrl, currentSong.title);
              if (result === "copied") demo.notify("Lien de la chanson copié dans le presse-papiers.");
              if (result === "failed") demo.notify("Impossible de partager cette chanson pour le moment.");
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
                demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                return;
              }
              const ok = await downloadAudioFile(audioUrl, currentSong.title);
              if (!ok) demo.notify("Le téléchargement a échoué. Réessaie dans un instant.");
            }}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon i="download" size={16} />
            {t("Télécharger")}
          </button>
        </div>
      </div>

      {/* Queue/Up Next */}
      <div className="px-4 pb-6 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("Suivant")}</p>
        <div className="space-y-2">
          {demo.library
            .filter((song) => song.id !== currentSong.id)
            .slice(0, 2)
            .map((song) => (
              <div key={song.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/30">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon i="music-2" size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.style}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{song.duration}</span>
              </div>
            ))}
          {demo.library.filter((song) => song.id !== currentSong.id).length === 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">Aucune autre chanson</p>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Découvrir")} />
    </div>
  );
}
