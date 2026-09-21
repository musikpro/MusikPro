export type OccasionOption = {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
};

export const OCCASION_EMOJI_OPTIONS = [
  { value: "🎂", label: "Anniversaire" },
  { value: "💕", label: "Amour" },
  { value: "🎓", label: "Diplôme" },
  { value: "🎉", label: "Fête" },
  { value: "💔", label: "Séparation" },
  { value: "🙏", label: "Gratitude" },
  { value: "🌙", label: "Sérénité" },
  { value: "🔥", label: "Motivation" },
  { value: "💍", label: "Mariage" },
  { value: "👶", label: "Naissance" },
  { value: "🎁", label: "Cadeau" },
  { value: "🎄", label: "Noël" },
  { value: "🎆", label: "Nouvel an" },
  { value: "🏆", label: "Victoire" },
  { value: "⚽", label: "Football" },
  { value: "🎤", label: "Concert" },
  { value: "🎵", label: "Musique" },
  { value: "💐", label: "Hommage" },
  { value: "🌹", label: "Romance" },
  { value: "🕊️", label: "Paix" },
  { value: "🕯️", label: "Souvenir" },
  { value: "☀️", label: "Bonheur" },
  { value: "🌈", label: "Espoir" },
  { value: "🏖️", label: "Vacances" },
  { value: "✈️", label: "Voyage" },
  { value: "🏠", label: "Maison" },
  { value: "🥳", label: "Célébration" },
  { value: "😂", label: "Joie" },
  { value: "😊", label: "Sourire" },
  { value: "😢", label: "Émotion" },
  { value: "💪", label: "Courage" },
  { value: "👨‍👩‍👧‍👦", label: "Famille" },
  { value: "🤝", label: "Amitié" },
  { value: "🫶", label: "Affection" },
  { value: "❤️", label: "Cœur" },
  { value: "🤍", label: "Tendresse" },
  { value: "💙", label: "Confiance" },
  { value: "🎊", label: "Festivité" },
  { value: "🍾", label: "Réussite" },
  { value: "🥂", label: "Union" },
  { value: "🎈", label: "Surprise" },
  { value: "🍼", label: "Bébé" },
  { value: "📚", label: "Études" },
  { value: "💼", label: "Travail" },
  { value: "🚀", label: "Nouveau départ" },
  { value: "🌍", label: "Monde" },
  { value: "🌻", label: "Épanouissement" },
  { value: "🏅", label: "Accomplissement" },
] as const;

export type OccasionEmoji = (typeof OCCASION_EMOJI_OPTIONS)[number]["value"];

export function isOccasionEmoji(value: string): value is OccasionEmoji {
  return OCCASION_EMOJI_OPTIONS.some((option) => option.value === value);
}

export const DEFAULT_OCCASIONS: OccasionOption[] = [
  {
    id: "default-birthday",
    name: "Anniversaire",
    slug: "anniversaire",
    description: "Célébrer une naissance et les moments partagés.",
    emoji: "🎂",
  },
  {
    id: "default-love",
    name: "Amour",
    slug: "amour",
    description: "Déclarer ses sentiments et raconter une histoire à deux.",
    emoji: "💕",
  },
  {
    id: "default-graduation",
    name: "Graduation",
    slug: "graduation",
    description: "Marquer une réussite scolaire ou universitaire.",
    emoji: "🎓",
  },
  {
    id: "default-party",
    name: "Fête",
    slug: "fete",
    description: "Créer une chanson joyeuse pour un moment festif.",
    emoji: "🎉",
  },
  {
    id: "default-breakup",
    name: "Séparation",
    slug: "separation",
    description: "Mettre en musique une rupture ou un nouveau départ.",
    emoji: "💔",
  },
  {
    id: "default-gratitude",
    name: "Gratitude",
    slug: "gratitude",
    description: "Dire merci avec des mots personnels et sincères.",
    emoji: "🙏",
  },
  {
    id: "default-serenity",
    name: "Sérénité",
    slug: "serenite",
    description: "Créer une chanson calme, douce et apaisante.",
    emoji: "🌙",
  },
  {
    id: "default-motivation",
    name: "Motivation",
    slug: "motivation",
    description: "Donner de l’élan, du courage et de l’énergie.",
    emoji: "🔥",
  },
];
