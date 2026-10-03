/**
 * Dictionnaire en mémoire des traductions de textes fixes stockées en base (table ui_translations),
 * consulté par translate() après les fichiers JSON. Sans dépendance serveur : importé côté client
 * (hook use-overlay) comme côté serveur (pages rendues avec primeOverlay).
 */
export type OverlayLocale = "en" | "es" | "pt";

const overlays: Partial<Record<OverlayLocale, Record<string, string>>> = {};
const listeners = new Set<() => void>();
let version = 0;
let ready = false;

/** Vrai quand l'hydratation est terminée côté client : avant, translate() reste en français (HTML serveur). */
export function isI18nReady(): boolean {
  return ready;
}

/** Pose l'indicateur et notifie les abonnés (re-rendu traduit). Idempotent. */
export function markI18nReady(): void {
  if (ready) return;
  ready = true;
  version += 1;
  for (const listener of listeners) listener();
}

export function resetI18nReadyForTests(): void {
  ready = false;
}

export function getOverlayEntry(locale: string, text: string): string | undefined {
  const dictionary = overlays[locale as OverlayLocale];
  return dictionary && Object.hasOwn(dictionary, text) ? dictionary[text] : undefined;
}

export function setOverlay(locale: OverlayLocale, dictionary: Record<string, string>): void {
  overlays[locale] = dictionary;
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOverlayVersion(): number {
  return version;
}

export function resetOverlayForTests(): void {
  for (const key of Object.keys(overlays)) delete overlays[key as OverlayLocale];
  listeners.clear();
}
