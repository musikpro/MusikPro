import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { heroAnimatedTexts } from "@/db/schema";
import type { CatalogTranslations } from "@/lib/i18n/translate";

export type HeroAnimatedText = {
  id: string;
  label: string;
  emoji: string;
  translations: CatalogTranslations | null;
};

/**
 * Words/phrases cycled by the landing Hero's rotating line (components/banani/HeroRotatingText.tsx),
 * managed from /admin/animated-texts. Returns [] on any DB error so the Hero just renders without
 * the rotating line instead of breaking the public landing page.
 */
export async function getActiveHeroAnimatedTexts(): Promise<HeroAnimatedText[]> {
  try {
    const rows = await db
      .select()
      .from(heroAnimatedTexts)
      .where(eq(heroAnimatedTexts.active, true))
      .orderBy(asc(heroAnimatedTexts.sortOrder), asc(heroAnimatedTexts.label));
    return rows.map(({ id, label, emoji, translations }) => ({
      id,
      label,
      emoji,
      translations: translations as CatalogTranslations | null,
    }));
  } catch {
    return [];
  }
}
