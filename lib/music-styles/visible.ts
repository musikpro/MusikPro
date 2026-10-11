/** Nombre de styles musicaux montrés d'emblée à l'étape « style et ambiance » : défaut et bornes du réglage. */
export const VISIBLE_MUSIC_STYLES_DEFAULT = 9;
export const VISIBLE_MUSIC_STYLES_MIN = 3;
export const VISIBLE_MUSIC_STYLES_MAX = 30;

/** Ramène une valeur quelconque (base, saisie) à un entier dans les bornes, sinon au défaut. */
export function normalizeVisibleMusicStyles(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return VISIBLE_MUSIC_STYLES_DEFAULT;
  return Math.min(VISIBLE_MUSIC_STYLES_MAX, Math.max(VISIBLE_MUSIC_STYLES_MIN, Math.round(number)));
}

/**
 * Sépare les styles montrés d'emblée de ceux qu'on déroule. Le style déjà choisi (reprise de brouillon, retour
 * arrière) n'est jamais caché : s'il est au-delà du seuil, la liste démarre dépliée.
 */
export function splitVisibleStyles<T extends { name: string }>(
  styles: readonly T[],
  visibleCount: number,
  selectedName: string,
): { initial: T[]; more: T[]; startsExpanded: boolean } {
  const count = normalizeVisibleMusicStyles(visibleCount);
  if (styles.length <= count) return { initial: [...styles], more: [], startsExpanded: false };
  const selectedIndex = styles.findIndex((style) => style.name === selectedName);
  return {
    initial: styles.slice(0, count),
    more: styles.slice(count),
    startsExpanded: selectedIndex >= count,
  };
}
