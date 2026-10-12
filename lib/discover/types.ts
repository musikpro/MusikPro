export const DISCOVER_SORT_OPTIONS = ["recent", "popular"] as const;
export type DiscoverSort = (typeof DISCOVER_SORT_OPTIONS)[number];

export const DISCOVER_MAX_ITEMS_MIN = 12;
export const DISCOVER_MAX_ITEMS_MAX = 200;

export type DiscoverSettingsValue = { enabled: boolean; sortBy: DiscoverSort; maxItems: number };

/** One song of the client "Découvrir" page — one entry per song (its two versions share a group). */
export type DiscoverSong = {
  songGroupId: string;
  title: string;
  style: string | null;
  plays: number;
  coverUrl: string | null;
  audioUrl: string;
  /** Titre raccourci (« … ») selon le réglage du propriétaire, pour les cartes ; `title` reste le titre complet. */
  displayTitle?: string;
  /** True for the viewer's own songs — only those get a "Retirer" button. */
  mine: boolean;
};
