export const HERO_ANIMATION_TYPES = ["fade", "slide", "typewriter", "zoom"] as const;
export type HeroAnimationType = (typeof HERO_ANIMATION_TYPES)[number];

export const HERO_ANIMATION_TYPE_LABELS: Record<HeroAnimationType, string> = {
  fade: "Fondu",
  slide: "Glissement",
  typewriter: "Machine à écrire",
  zoom: "Zoom",
};

export const HERO_TEXT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type HeroTextSize = (typeof HERO_TEXT_SIZES)[number];

export const HERO_TEXT_SIZE_LABELS: Record<HeroTextSize, string> = {
  sm: "Petit",
  md: "Moyen",
  lg: "Grand",
  xl: "Très grand",
};

/** Tailwind size steps for HeroRotatingText — desktop and mobile scale together. */
export const HERO_TEXT_SIZE_CLASSES: Record<HeroTextSize, { desktop: string; mobile: string }> = {
  sm: { desktop: "text-xl", mobile: "text-base" },
  md: { desktop: "text-2xl", mobile: "text-lg" },
  lg: { desktop: "text-3xl", mobile: "text-xl" },
  xl: { desktop: "text-4xl", mobile: "text-2xl" },
};
