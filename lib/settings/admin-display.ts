import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { adminDisplaySettings } from "@/db/schema";
import { VISIBLE_MUSIC_STYLES_DEFAULT, normalizeVisibleMusicStyles } from "@/lib/music-styles/visible";
import {
  GENERATIONS_PER_PAGE_DEFAULT,
  USERS_PER_PAGE_DEFAULT,
  normalizeGenerationsPerPage,
  normalizeUsersPerPage,
} from "./admin-display-constants";

export type AdminDisplaySettings = { generationsPerPage: number; usersPerPage: number };

/**
 * Éléments par page des listes du tableau de bord propriétaire (Paramètres > Général). Absence de ligne ou table pas
 * encore migrée = 50, pour que les pages fonctionnent avant l'application des migrations 0076 et 0077.
 */
export async function getAdminDisplaySettings(): Promise<AdminDisplaySettings> {
  try {
    const [row] = await getServiceDb()
      .select({
        generationsPerPage: adminDisplaySettings.generationsPerPage,
        usersPerPage: adminDisplaySettings.usersPerPage,
      })
      .from(adminDisplaySettings)
      .where(eq(adminDisplaySettings.id, "global"))
      .limit(1);
    return {
      generationsPerPage: normalizeGenerationsPerPage(row?.generationsPerPage ?? GENERATIONS_PER_PAGE_DEFAULT),
      usersPerPage: normalizeUsersPerPage(row?.usersPerPage ?? USERS_PER_PAGE_DEFAULT),
    };
  } catch {
    return { generationsPerPage: GENERATIONS_PER_PAGE_DEFAULT, usersPerPage: USERS_PER_PAGE_DEFAULT };
  }
}

/** Nombre de chansons par page sur /admin/generations. */
export async function getGenerationsPerPage(): Promise<number> {
  return (await getAdminDisplaySettings()).generationsPerPage;
}

/** Nombre de comptes par page sur /admin/users. */
export async function getUsersPerPage(): Promise<number> {
  return (await getAdminDisplaySettings()).usersPerPage;
}

/**
 * Styles musicaux montrés d'emblée à l'étape « style et ambiance » (Paramètres > Général), 9 par défaut. Requête
 * séparée : tant que la migration 0081 n'est pas appliquée, la colonne manque et on retombe sur 9 sans affecter les
 * autres réglages d'affichage.
 */
export async function getVisibleMusicStyles(): Promise<number> {
  try {
    const [row] = await getServiceDb()
      .select({ value: adminDisplaySettings.visibleMusicStyles })
      .from(adminDisplaySettings)
      .where(eq(adminDisplaySettings.id, "global"))
      .limit(1);
    return normalizeVisibleMusicStyles(row?.value ?? VISIBLE_MUSIC_STYLES_DEFAULT);
  } catch {
    return VISIBLE_MUSIC_STYLES_DEFAULT;
  }
}
