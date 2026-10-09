/**
 * Une chanson mise en avant ne peut occuper qu'une seule place parmi : « Ils ont créé avec MusikPro »,
 * « Bibliothèque populaire » (landing publique) et « Tendances » (tableau de bord client). Ce module est
 * pur (sans accès base) : il fusionne les emplacements connus et formule le refus, pour que les pages
 * d'administration, les Server Actions et les tests partagent la même règle.
 */

/** Nom affiché au propriétaire pour le widget « Tendances » du tableau de bord client. */
export const TRENDING_PLACEMENT_LABEL = "Tendances";

/** songGroupId → nom de la section qui utilise déjà cette chanson. */
export type SongPlacements = Record<string, string>;

/**
 * Fusionne les cartes de la landing et la sélection Tendances. En cas de chevauchement historique
 * (même chanson dans deux sections), la landing est citée en premier.
 */
export function mergeSongPlacements(
  landingCards: ReadonlyArray<{ songGroupId: string; label: string }>,
  trendingSongGroupIds: ReadonlyArray<string>,
): SongPlacements {
  const placements: SongPlacements = {};
  for (const card of landingCards) placements[card.songGroupId] ??= card.label;
  for (const songGroupId of trendingSongGroupIds) placements[songGroupId] ??= TRENDING_PLACEMENT_LABEL;
  return placements;
}

/** Retire de `placements` les chansons indiquées (ex. la chanson de la carte en cours de modification). */
export function placementsWithout(
  placements: SongPlacements,
  songGroupIds: ReadonlyArray<string | undefined>,
): SongPlacements {
  const ignored = new Set(songGroupIds.filter((id): id is string => Boolean(id)));
  return Object.fromEntries(Object.entries(placements).filter(([songGroupId]) => !ignored.has(songGroupId)));
}

export function songAlreadyUsedMessage(label: string): string {
  return `Cette chanson est déjà utilisée dans « ${label} » : une chanson n’est utilisable qu’une fois, avec sa version 1 et sa version 2.`;
}

/** Libellé court d'une chanson masquée : le titre peut exister en plusieurs exemplaires, un fragment d'identifiant les distingue. */
export function hiddenSongLabel(song: { songGroupId: string; title: string }, placement: string): string {
  return `${song.title} #${song.songGroupId.slice(0, 6)} (${placement})`;
}
