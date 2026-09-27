export const AMBIENT_MUTE_STORAGE_KEY = "musikpro-ambient-muted";

export function shouldShowAmbientBar(status: { enabled: boolean; audioUrl: string | null }): boolean {
  return status.enabled && Boolean(status.audioUrl);
}

export function readStoredMutePreference(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(AMBIENT_MUTE_STORAGE_KEY) === "1";
}

export function writeStoredMutePreference(storage: Pick<Storage, "setItem">, muted: boolean): void {
  storage.setItem(AMBIENT_MUTE_STORAGE_KEY, muted ? "1" : "0");
}

/**
 * Décide de l'état `muted` final à appliquer à l'élément `<audio>` après une tentative
 * `play()` : si le navigateur a bloqué l'autoplay avec son, on reste muet quoi qu'il arrive
 * (le bouton son sert de rattrapage) ; sinon on respecte la préférence déjà mémorisée par
 * l'utilisateur.
 */
export function resolveAutoplayOutcome(playSucceeded: boolean, storedMutePreference: boolean): boolean {
  if (!playSucceeded) return true;
  return storedMutePreference;
}

/**
 * Décide si un événement `error` sur l'élément `<audio>` doit masquer définitivement la bande.
 * `MediaError.MEDIA_ERR_ABORTED` (code 1) signifie que le chargement a été interrompu — par un
 * `pause()`/démontage normal du cycle de vie du composant (notamment le double montage de React
 * Strict Mode en développement), pas par un fichier cassé — donc ignoré. Les autres codes
 * (réseau, décodage, source non supportée) et l'absence de code signalent un vrai problème.
 */
export function isFatalAudioError(errorCode: number | null | undefined): boolean {
  return errorCode !== 1;
}
