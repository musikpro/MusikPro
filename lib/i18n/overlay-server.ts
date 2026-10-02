import "server-only";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { uiTranslations } from "@/db/schema";
import { setOverlay, type OverlayLocale } from "./overlay";
import type { Locale } from "./translate";

export const OVERLAY_TAG = "i18n-overlay";

/** Dictionnaire { texte français → traduction } d'une langue, lu en base et mis en cache jusqu'à la prochaine actualisation. */
export async function loadOverlay(locale: OverlayLocale): Promise<Record<string, string>> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({ source: uiTranslations.sourceText, translation: uiTranslations.translation })
        .from(uiTranslations)
        .where(eq(uiTranslations.locale, locale));
      return Object.fromEntries(rows.map((row) => [row.source, row.translation]));
    },
    [OVERLAY_TAG, locale],
    { tags: [OVERLAY_TAG] },
  )();
}

/** Pour une page rendue côté serveur : charge le dictionnaire avant d'appeler translateForLocale(). Sans effet en français ; une panne retombe sur les fichiers JSON. */
export async function primeOverlay(locale: Locale): Promise<void> {
  if (locale === "fr") return;
  try {
    setOverlay(locale, await loadOverlay(locale));
  } catch {
    // Repli : fichiers JSON puis français.
  }
}
