import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cachedCatalog } from "@/lib/catalog-cache/cached";
import { occasions } from "@/db/schema";
import { DEFAULT_OCCASIONS, type OccasionOption } from "./catalog";

/** Lecture en base ; lève en cas d'erreur (jamais mise en cache, voir cachedCatalog). */
async function loadActiveOccasions(): Promise<OccasionOption[]> {
  const rows = await db
    .select()
    .from(occasions)
    .where(eq(occasions.active, true))
    .orderBy(asc(occasions.sortOrder), asc(occasions.name));

  return rows.map(
    ({
      id,
      name,
      slug,
      description,
      emoji,
      translations,
      showRecipient,
      showSender,
      titleFieldId,
      storyTitle,
      storySubtitle,
      storyLabel,
      storyPlaceholder,
      storyTip,
    }) => ({
      id,
      name,
      slug,
      description,
      emoji,
      showRecipient,
      showSender,
      titleFieldId,
      storyTitle,
      storySubtitle,
      storyLabel,
      storyPlaceholder,
      storyTip,
      translations: translations as OccasionOption["translations"],
    }),
  );
}

/** Catalogue actif, en cache jusqu'à la prochaine modification admin (tag « catalog:occasions »). */
export async function getActiveOccasions(options: { demo?: boolean } = {}): Promise<OccasionOption[]> {
  try {
    return await cachedCatalog("occasions", loadActiveOccasions);
  } catch (error) {
    if (options.demo) return DEFAULT_OCCASIONS;
    throw error;
  }
}
