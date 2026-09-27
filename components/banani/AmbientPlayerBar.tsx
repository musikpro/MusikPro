"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";
import {
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
} from "@/lib/demo/ambient-player-logic";

const WAVEFORM_BARS = [6, 10, 7, 12, 8];

export default function AmbientPlayerBar({
  title,
  audioUrl,
  volumePercent,
}: {
  title: string | null;
  audioUrl: string;
  volumePercent: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(50, Math.max(5, volumePercent)) / 100;
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
        void audio.play().catch(() => setLoadError(true));
      });
    return () => {
      audio.pause();
    };
    // Le volume/URL ne changent jamais pendant la vie de ce composant (démonté/remonté par
    // page.tsx à chaque changement de réglage admin via revalidatePath) : un seul montage suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    writeStoredMutePreference(window.localStorage, next);
  };

  if (loadError) return null;

  return (
    <div className="ambient-player-bar" role="status" aria-label={t("Musique d'ambiance")}>
      <audio
        ref={audioRef}
        src={audioUrl}
        loop
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
        className="sr-only"
      />
      <div className={`song-inline-waveform ambient-player-waveform ${isPlaying && !muted ? "is-playing" : ""}`}>
        {WAVEFORM_BARS.map((h, i) => (
          <div key={i} className="w-1 rounded-sm bg-primary/60" style={{ height: `${h}px` }} />
        ))}
      </div>
      {title ? <span className="ambient-player-title">{title}</span> : null}
      <button
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? t("Réactiver le son de la musique d'ambiance") : t("Couper le son de la musique d'ambiance")}
        className="ambient-player-mute-button"
      >
        <Icon i={muted ? "volume-x" : "volume-2"} size={16} />
      </button>
    </div>
  );
}
