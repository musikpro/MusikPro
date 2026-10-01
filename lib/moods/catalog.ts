import type { CatalogTranslations } from "@/lib/i18n/translate";

export type MoodOption = {
  id: string;
  /** Nom français : valeur canonique choisie par le client et envoyée à la génération. */
  name: string;
  slug: string;
  description: string;
  emoji: string;
  /** Consigne envoyée à Musicful : lue côté serveur uniquement (jamais transmise au navigateur du client). */
  aiHint?: string;
  translations?: CatalogTranslations | null;
};

/** Emojis proposés dans l'admin pour une ambiance. */
export const MOOD_EMOJI_OPTIONS = [
  { value: "🚀", label: "Énergique" },
  { value: "💕", label: "Romantique" },
  { value: "👑", label: "Épique" },
  { value: "😂", label: "Joyeuse" },
  { value: "🎭", label: "Dramatique" },
  { value: "🌙", label: "Mystique" },
  { value: "🔥", label: "Intense" },
  { value: "🌊", label: "Apaisante" },
  { value: "🌅", label: "Nostalgique" },
  { value: "🕊️", label: "Paisible" },
  { value: "🙏", label: "Spirituelle" },
  { value: "🎉", label: "Festive" },
  { value: "💃", label: "Dansante" },
  { value: "😢", label: "Mélancolique" },
  { value: "🌹", label: "Sensuelle" },
  { value: "💪", label: "Motivante" },
  { value: "☀️", label: "Lumineuse" },
  { value: "🌈", label: "Optimiste" },
  { value: "🎷", label: "Jazzy" },
  { value: "🏝️", label: "Détendue" },
  { value: "⚡", label: "Électrique" },
  { value: "🌌", label: "Rêveuse" },
  { value: "🥁", label: "Rythmée" },
  { value: "🎶", label: "Musicale" },
  { value: "😎", label: "Cool" },
  { value: "🤗", label: "Chaleureuse" },
  { value: "🏆", label: "Triomphante" },
  { value: "🕯️", label: "Intime" },
] as const;

const MOOD_EMOJI_VALUES: readonly string[] = MOOD_EMOJI_OPTIONS.map((option) => option.value);

export function isMoodEmoji(value: string): boolean {
  return MOOD_EMOJI_VALUES.includes(value);
}

/** Longueur maximale de la consigne IA : l'ambiance fait partie du champ `style` de Musicful (1 000 caractères au total). */
/** Limites calées pour que ambiance + occasion + style + voix + directives tiennent dans les 1000 caractères de Musicful. */
export const MOOD_AI_HINT_MAX_LENGTH = 70;

/** Valeurs de départ (identiques à la migration 0057) : repli si la base est inaccessible en démo. */
export const DEFAULT_MOODS: MoodOption[] = [
  {
    id: "default-energetic",
    name: "Énergique",
    slug: "energique",
    description: "Dynamique et entraînante.",
    emoji: "🚀",
    aiHint: "energetic, upbeat, driving rhythm, high tempo",
  },
  {
    id: "default-romantic",
    name: "Romantique",
    slug: "romantique",
    description: "Tendre et sensible.",
    emoji: "💕",
    aiHint: "romantic, tender, warm, heartfelt, intimate",
  },
  {
    id: "default-epic",
    name: "Épique",
    slug: "epique",
    description: "Grandiose et majestueuse.",
    emoji: "👑",
    aiHint: "epic, majestic, grand, cinematic, powerful build-up",
  },
  {
    id: "default-joyful",
    name: "Joyeuse",
    slug: "joyeuse",
    description: "Fun et pleine de bonne humeur.",
    emoji: "😂",
    aiHint: "joyful, fun, cheerful, feel-good, bright",
  },
  {
    id: "default-dramatic",
    name: "Dramatique",
    slug: "dramatique",
    description: "Intense et théâtrale.",
    emoji: "🎭",
    aiHint: "dramatic, intense, emotional, theatrical, powerful",
  },
  {
    id: "default-mystic",
    name: "Mystique",
    slug: "mystique",
    description: "Magique et envoûtante.",
    emoji: "🌙",
    aiHint: "mystical, magical, ethereal, enchanting, atmospheric",
  },
];
