/**
 * Règle commune « une seule chanson à la fois » (landing, tableau de bord client, admin, page publique).
 *
 * La musique d'ambiance du tableau de bord est volontairement exclue : elle a sa propre logique
 * (`AmbientPlayerContext` la baisse quand une chanson joue puis la relance), et elle ne doit ni couper une
 * chanson en démarrant, ni être coupée ici en doublon de cette logique.
 */
export const AMBIENT_AUDIO_ATTRIBUTE = "data-audio-role";
export const AMBIENT_AUDIO_ROLE = "ambient";

type MediaLike = {
  paused: boolean;
  getAttribute?: (name: string) => string | null;
};

export function isAmbientAudio(media: MediaLike) {
  return media.getAttribute?.(AMBIENT_AUDIO_ATTRIBUTE) === AMBIENT_AUDIO_ROLE;
}

/** Médias en cours de lecture à mettre en pause quand `started` démarre. */
export function mediaToPause<T extends MediaLike>(started: T, all: Iterable<T>): T[] {
  if (isAmbientAudio(started)) return [];
  return Array.from(all).filter((media) => media !== started && !media.paused && !isAmbientAudio(media));
}
