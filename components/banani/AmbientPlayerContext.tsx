"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
  isFatalAudioError,
  shouldShowAmbientBar,
} from "@/lib/demo/ambient-player-logic";

type AmbientPlayerContextValue = {
  enabled: boolean;
  isPlaying: boolean;
  muted: boolean;
  toggleMuted: () => void;
};

const AmbientPlayerContext = createContext<AmbientPlayerContextValue>({
  enabled: false,
  isPlaying: false,
  muted: true,
  toggleMuted: () => {},
});

export function useAmbientPlayer() {
  return useContext(AmbientPlayerContext);
}

/**
 * Possède le seul élément <audio> de la musique d'ambiance et l'expose via contexte, pour que le
 * bouton visible dans la barre du haut puisse être placé à la fois dans UserDashboardMobile et
 * UserDashboardDesktop (montés simultanément dans le DOM — voir app/dashboard/page.tsx) sans
 * jamais dupliquer la lecture audio elle-même.
 */
export function AmbientPlayerProvider({
  status,
  children,
}: {
  status: { enabled: boolean; audioUrl: string | null; volumePercent: number };
  children: ReactNode;
}) {
  const enabled = shouldShowAmbientBar(status);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const pendingPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckedRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    if (pendingPauseRef.current !== null) {
      // React Strict Mode (dev only) double-invokes this effect on first mount: mount → cleanup
      // → mount again, synchronously. The cleanup below defers its pause() by one tick instead of
      // calling it immediately, so this second mount can cancel it here before it ever fires —
      // audio keeps playing uninterrupted, and play() below is never called a second time on the
      // same element. A real unmount has no following remount, so the deferred pause always runs.
      clearTimeout(pendingPauseRef.current);
      pendingPauseRef.current = null;
      return () => {
        pendingPauseRef.current = setTimeout(() => audio.pause(), 0);
      };
    }
    if (startedRef.current) return undefined;
    startedRef.current = true;

    audio.volume = Math.min(50, Math.max(5, status.volumePercent)) / 100;
    const storedMutePreference = readStoredMutePreference(window.localStorage);
    audio.muted = false;
    audio
      .play()
      .then(() => {
        const finalMuted = resolveAutoplayOutcome(true, storedMutePreference);
        audio.muted = finalMuted;
        setMuted(finalMuted);
      })
      .catch(() => {
        const finalMuted = resolveAutoplayOutcome(false, storedMutePreference);
        audio.muted = finalMuted;
        setMuted(finalMuted);
        // Une deuxième tentative peut elle aussi rejeter pour des raisons sans rapport avec un
        // fichier cassé (ex. interrompue par le pause() du nettoyage de cet effet) — le vrai
        // signal d'échec définitif est l'événement natif `error` de l'élément <audio> ci-dessous,
        // pas le rejet de cette promesse.
        void audio.play().catch(() => {});
      });
    return () => {
      pendingPauseRef.current = setTimeout(() => audio.pause(), 0);
    };
    // Le volume/URL ne changent jamais pendant la vie de ce composant (démonté/remonté par
    // page.tsx à chaque changement de réglage admin via revalidatePath) : un seul montage suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;
    // The native play/pause/ended events don't bubble, but they do fire during the capture phase
    // on every ancestor — one listener here can therefore duck the ambient track the instant ANY
    // other <audio>/<video> on the dashboard (a song card, a future player, ...) starts, and bring
    // it back the instant none of them are playing anymore, with no change needed at each of those
    // call sites and no risk of missing a future one.
    const reconcile = (event: Event) => {
      if (event.target === audio) return;
      const others = Array.from(document.querySelectorAll("audio, video")).filter((el) => el !== audio);
      const otherPlaying = others.some((el) => !(el as HTMLMediaElement).paused && !(el as HTMLMediaElement).ended);
      if (otherPlaying) {
        if (!audio.paused) {
          duckedRef.current = true;
          audio.pause();
        }
      } else if (duckedRef.current) {
        duckedRef.current = false;
        void audio.play().catch(() => {});
      }
    };
    document.addEventListener("play", reconcile, true);
    document.addEventListener("pause", reconcile, true);
    document.addEventListener("ended", reconcile, true);
    return () => {
      document.removeEventListener("play", reconcile, true);
      document.removeEventListener("pause", reconcile, true);
      document.removeEventListener("ended", reconcile, true);
    };
  }, [enabled]);

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    writeStoredMutePreference(window.localStorage, next);
    // Réactiver le son doit vraiment relancer la lecture si elle s'est arrêtée (ex. échec
    // d'autoplay non rattrapé) — un visiteur qui clique "réactiver le son" sur un bouton
    // silencieux et immobile s'attend à entendre la musique, pas seulement à lever le drapeau
    // muet d'un flux à l'arrêt.
    if (!next && audio.paused) void audio.play().catch(() => {});
  };

  return (
    <AmbientPlayerContext.Provider value={{ enabled: enabled && !loadError, isPlaying, muted, toggleMuted }}>
      {enabled && !loadError ? (
        <audio
          ref={audioRef}
          src={status.audioUrl as string}
          loop
          onPlaying={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            const errorCode = audioRef.current?.error?.code ?? null;
            if (isFatalAudioError(errorCode)) setLoadError(true);
          }}
          className="sr-only"
        />
      ) : null}
      {children}
    </AmbientPlayerContext.Provider>
  );
}
