/**
 * Réglage COMMUN de tous les visualiseurs audio de MusikPro (page de partage, carte tendance, mini forme d'onde
 * des chansons, bouton d'ambiance). Pour changer l'apparence ou le comportement d'un visualiseur, modifier
 * uniquement ce fichier et `components/ui/audio-visualizer.css` — jamais un réglage local dans une page.
 */

export type AudioVisualizerVariant = "player" | "card" | "inline" | "ambient";

export type AudioVisualizerSettings = {
  /** Nombre de barres (ignoré si `heights` est fourni). */
  count: number;
  /** Hauteur fixe de chaque barre en px, dans l'ordre ; sinon les barres occupent toute la hauteur du visualiseur. */
  heights?: readonly number[];
};

/** Réglages propres à chaque emplacement ; les dimensions et couleurs correspondantes sont dans le CSS commun. */
export const AUDIO_VISUALIZER_VARIANTS: Record<AudioVisualizerVariant, AudioVisualizerSettings> = {
  player: { count: 28 },
  card: { count: 24 },
  inline: { count: 20, heights: [3, 6, 4, 9, 7, 5, 10, 8, 6, 9, 5, 7, 4, 8, 6, 10, 7, 5, 8, 4] },
  ambient: { count: 3, heights: [4, 7, 5] },
};

/** Désynchronise les barres : durée et décalage dérivés de l'index, identiques partout. */
export function audioVisualizerBarTiming(index: number) {
  return {
    durationMs: 520 + ((index * 53) % 420),
    // Décalage négatif : toutes les barres bougent dès le début de la lecture.
    delayMs: -((index * 97) % 700),
  };
}

export function audioVisualizerBarCount(variant: AudioVisualizerVariant): number {
  const settings = AUDIO_VISUALIZER_VARIANTS[variant];
  return settings.heights?.length ?? settings.count;
}
