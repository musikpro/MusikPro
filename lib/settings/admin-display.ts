import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { adminDisplaySettings } from "@/db/schema";
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
