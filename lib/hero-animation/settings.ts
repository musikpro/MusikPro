import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { heroAnimationSettings } from "@/db/schema";
import type { CatalogTranslations } from "@/lib/i18n/translate";
import { HERO_ANIMATION_TYPES, HERO_TEXT_SIZES, type HeroAnimationType, type HeroTextSize } from "./types";

export {
  HERO_ANIMATION_TYPES,
  HERO_ANIMATION_TYPE_LABELS,
  HERO_TEXT_SIZES,
  HERO_TEXT_SIZE_LABELS,
  HERO_TEXT_SIZE_CLASSES,
} from "./types";
export type { HeroAnimationType, HeroTextSize } from "./types";

const DEFAULT_HEADLINE = "Crée ta chanson personnalisée";
const DEFAULT_ANIMATION_TYPE: HeroAnimationType = "fade";
const DEFAULT_TEXT_SIZE: HeroTextSize = "md";

export type HeroSettings = {
  headline: string;
  translations: CatalogTranslations | null;
  animationType: HeroAnimationType;
  textSize: HeroTextSize;
};

const DEFAULT_SETTINGS: HeroSettings = {
  headline: DEFAULT_HEADLINE,
  translations: null,
  animationType: DEFAULT_ANIMATION_TYPE,
  textSize: DEFAULT_TEXT_SIZE,
};

function normalizeAnimationType(value: string): HeroAnimationType {
  return (HERO_ANIMATION_TYPES as readonly string[]).includes(value)
    ? (value as HeroAnimationType)
    : DEFAULT_ANIMATION_TYPE;
}
function normalizeTextSize(value: string): HeroTextSize {
  return (HERO_TEXT_SIZES as readonly string[]).includes(value) ? (value as HeroTextSize) : DEFAULT_TEXT_SIZE;
}

/** Global Hero setting read by both the public landing (app/page.tsx) and the admin settings panel. */
export async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const [row] = await db
      .select()
      .from(heroAnimationSettings)
      .where(eq(heroAnimationSettings.id, "global"))
      .limit(1);
    if (!row) return DEFAULT_SETTINGS;
    return {
      headline: row.headline || DEFAULT_HEADLINE,
      translations: row.translations as CatalogTranslations | null,
      animationType: normalizeAnimationType(row.animationType),
      textSize: normalizeTextSize(row.textSize),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
