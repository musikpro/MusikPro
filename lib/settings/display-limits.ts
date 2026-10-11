import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { adminDisplaySettings } from "@/db/schema";
import {
  DISPLAY_LIMITS_DEFAULTS,
  normalizeMusicStylesMaxCount,
  normalizeTitleMaxChars,
  type DisplayLimits,
} from "./display-limits-constants";

/**
 * Limites d'affichage côté client (longueur des titres, nombre de styles sur la landing). Absence de ligne ou
 * colonnes pas encore migrées (0081) = valeurs par défaut, pour que la landing et le dashboard fonctionnent avant
 * l'application de la migration.
 */
export async function getDisplayLimits(): Promise<DisplayLimits> {
  try {
    const [row] = await getServiceDb()
      .select({
        landingShowcaseTitleMaxChars: adminDisplaySettings.landingShowcaseTitleMaxChars,
        landingLibraryTitleMaxChars: adminDisplaySettings.landingLibraryTitleMaxChars,
        trendingTitleMaxChars: adminDisplaySettings.trendingTitleMaxChars,
        landingMusicStylesMaxCount: adminDisplaySettings.landingMusicStylesMaxCount,
      })
      .from(adminDisplaySettings)
      .where(eq(adminDisplaySettings.id, "global"))
      .limit(1);
    if (!row) return DISPLAY_LIMITS_DEFAULTS;
    return {
      landingShowcaseTitleMaxChars: normalizeTitleMaxChars(row.landingShowcaseTitleMaxChars),
      landingLibraryTitleMaxChars: normalizeTitleMaxChars(row.landingLibraryTitleMaxChars),
      trendingTitleMaxChars: normalizeTitleMaxChars(row.trendingTitleMaxChars),
      landingMusicStylesMaxCount: normalizeMusicStylesMaxCount(row.landingMusicStylesMaxCount),
    };
  } catch {
    return DISPLAY_LIMITS_DEFAULTS;
  }
}
