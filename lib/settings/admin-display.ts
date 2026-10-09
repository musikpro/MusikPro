import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { adminDisplaySettings } from "@/db/schema";
import { GENERATIONS_PER_PAGE_DEFAULT, normalizeGenerationsPerPage } from "./admin-display-constants";

/**
 * Nombre de chansons par page sur /admin/generations (Paramètres > Général). Absence de ligne ou table pas encore
 * migrée = 50, pour que la page fonctionne avant l'application de la migration 0076.
 */
export async function getGenerationsPerPage(): Promise<number> {
  try {
    const [row] = await getServiceDb()
      .select({ value: adminDisplaySettings.generationsPerPage })
      .from(adminDisplaySettings)
      .where(eq(adminDisplaySettings.id, "global"))
      .limit(1);
    return normalizeGenerationsPerPage(row?.value ?? GENERATIONS_PER_PAGE_DEFAULT);
  } catch {
    return GENERATIONS_PER_PAGE_DEFAULT;
  }
}
