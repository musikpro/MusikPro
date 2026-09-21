export type LibraryCollectionOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
  access: "public" | "private";
  styles: string[];
  sortOrder: number;
};

export const DEFAULT_LIBRARY_COLLECTIONS: LibraryCollectionOption[] = [
  {
    id: "collection-afro",
    name: "Afrobeat Essentials",
    slug: "afrobeat-essentials",
    description: "Les rythmes africains les plus énergiques du moment.",
    access: "public",
    styles: ["Afrobeat", "Afro-Pop"],
    sortOrder: 10,
  },
  {
    id: "collection-gospel",
    name: "Gospel & inspiration",
    slug: "gospel-inspiration",
    description: "Des voix puissantes pour célébrer la foi et la gratitude.",
    access: "public",
    styles: ["Gospel"],
    sortOrder: 20,
  },
  {
    id: "collection-amapiano",
    name: "Ambiance Amapiano",
    slug: "ambiance-amapiano",
    description: "Pianos, percussions et énergie sud-africaine.",
    access: "public",
    styles: ["Amapiano"],
    sortOrder: 30,
  },
  {
    id: "collection-emotions",
    name: "Douceur & émotions",
    slug: "douceur-emotions",
    description: "Une sélection sensible pour l’amour et les moments intimes.",
    access: "public",
    styles: ["R&B", "Acoustique"],
    sortOrder: 40,
  },
];

export function parseCollectionStyles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 30);
}
