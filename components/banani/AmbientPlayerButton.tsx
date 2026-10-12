"use client";
import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";
import { useAmbientPlayer } from "./AmbientPlayerContext";
import AudioVisualizer from "@/components/ui/audio-visualizer";


/**
 * Bouton compact destiné à la barre du haut (desktop et mobile) — jamais une bande séparée.
 * Ne rend rien si aucune piste d'ambiance n'est active ; consomme le moteur audio unique via
 * AmbientPlayerContext plutôt que d'en instancier un nouveau (ce composant peut être monté à la
 * fois dans UserDashboardMobile et UserDashboardDesktop, montés simultanément dans le DOM).
 */
export default function AmbientPlayerButton({ compact = false }: { compact?: boolean }) {
  const { enabled, isPlaying, muted, toggleMuted } = useAmbientPlayer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? t("Réactiver le son de la musique d'ambiance") : t("Couper le son de la musique d'ambiance")}
      className={`ambient-player-button ${compact ? "is-compact" : ""}`}
    >
      <Icon i={muted ? "volume-x" : "volume-2"} size={compact ? 15 : 18} className="text-muted-foreground" />
      <AudioVisualizer variant="ambient" playing={isPlaying && !muted} />
    </button>
  );
}
