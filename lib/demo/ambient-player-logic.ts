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
