"use client";
import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";
import { useAmbientPlayer } from "./AmbientPlayerContext";

const WAVEFORM_BARS = [4, 7, 5];

/**
 * Bouton compact destiné à la barre du haut (desktop et mobile) — jamais une bande séparée.
 * Ne rend rien si aucune piste d'ambiance n'est active ; consomme le moteur audio unique via
 * AmbientPlayerContext plutôt que d'en instancier un nouveau (ce composant peut être monté à la
 * fois dans UserDashboardMobile et UserDashboardDesktop, montés simultanément dans le DOM).
 */
export default function AmbientPlayerButton() {
  const { enabled, isPlaying, muted, toggleMuted } = useAmbientPlayer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? t("Réactiver le son de la musique d'ambiance") : t("Couper le son de la musique d'ambiance")}
      className="ambient-player-button relative"
    >
      <Icon i={muted ? "volume-x" : "volume-2"} size={18} className="text-muted-foreground" />
      <span
        className={`song-inline-waveform ambient-player-button-waveform ${isPlaying && !muted ? "is-playing" : ""}`}
      >
        {WAVEFORM_BARS.map((h, i) => (
          <span key={i} className="ambient-player-button-bar" style={{ height: `${h}px` }} />
        ))}
      </span>
    </button>
  );
}
