export const MUSIC_STYLE_ICONS = [
  "music",
  "music-2",
  "music-3",
  "music-4",
  "drum",
  "guitar",
  "audio-waveform",
  "mic",
  "radio",
  "headphones",
  "speaker",
  "volume-2",
  "disc-3",
  "disc-album",
  "church",
  "heart",
  "heart-pulse",
  "flame",
  "zap",
  "sun",
  "moon",
  "crown",
  "trophy",
  "party-popper",
  "gem",
  "diamond",
  "feather",
  "leaf",
  "flower-2",
  "bird",
  "wind",
  "cloud-sun",
  "piano",
  "circle-play",
  "play",
  "radio-tower",
  "cassette-tape",
  "bell-ring",
  "boom-box",
  "clapperboard",
  "orbit",
  "rainbow",
  "mountain",
  "trees",
] as const;

export const MUSIC_STYLE_TONES = [
  "orange",
  "coral",
  "red",
  "rose",
  "pink",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "amber",
  "yellow",
  "slate",
] as const;

export type MusicStyleIcon = (typeof MUSIC_STYLE_ICONS)[number];
export type MusicStyleTone = (typeof MUSIC_STYLE_TONES)[number];

import type { CatalogTranslations } from "@/lib/i18n/translate";

export type MusicStyleOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: MusicStyleIcon;
  tone: MusicStyleTone;
  translations?: CatalogTranslations | null;
};

export const DEFAULT_MUSIC_STYLES: MusicStyleOption[] = [
  {
    id: "default-afrobeat",
    name: "Afrobeat",
    slug: "afrobeat",
    description: "Rythmes africains énergiques et dansants",
    icon: "drum",
    tone: "orange",
  },
  {
    id: "default-amapiano",
    name: "Amapiano",
    slug: "amapiano",
    description: "Piano et percussions sud-africaines",
    icon: "audio-waveform",
    tone: "violet",
  },
  {
    id: "default-gospel",
    name: "Gospel",
    slug: "gospel",
    description: "Émotion, spiritualité et voix inspirantes",
    icon: "church",
    tone: "green",
  },
  {
    id: "default-rnb",
    name: "R&B",
    slug: "r-and-b",
    description: "Son doux, moderne et émotionnel",
    icon: "heart-pulse",
    tone: "rose",
  },
  {
    id: "default-acoustique",
    name: "Acoustique",
    slug: "acoustique",
    description: "Instruments naturels et ambiance intime",
    icon: "guitar",
    tone: "amber",
  },
  {
    id: "default-reggae",
    name: "Reggae",
    slug: "reggae",
    description: "Rythme chaleureux, détendu et positif",
    icon: "music-2",
    tone: "green",
  },
];

export function isMusicStyleIcon(value: string): value is MusicStyleIcon {
  return MUSIC_STYLE_ICONS.includes(value as MusicStyleIcon);
}

export function isMusicStyleTone(value: string): value is MusicStyleTone {
  return MUSIC_STYLE_TONES.includes(value as MusicStyleTone);
}
