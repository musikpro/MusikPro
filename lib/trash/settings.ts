import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { trashSettings } from "@/db/schema";
import { TRASH_RETENTION_DEFAULT_DAYS, normalizeRetentionDays } from "./retention";

export type TrashRetention = {
  songsRetentionDays: number;
  usersRetentionDays: number;
  guestLinksRetentionDays: number;
};

/** Délais de conservation (30 jours par défaut). Absence de ligne ou table pas encore migrée = 30 jours. */
export async function getTrashRetention(): Promise<TrashRetention> {
  try {
    const [row] = await getServiceDb().select().from(trashSettings).where(eq(trashSettings.id, "global")).limit(1);
    return {
      songsRetentionDays: normalizeRetentionDays(row?.songsRetentionDays ?? TRASH_RETENTION_DEFAULT_DAYS),
      usersRetentionDays: normalizeRetentionDays(row?.usersRetentionDays ?? TRASH_RETENTION_DEFAULT_DAYS),
      guestLinksRetentionDays: normalizeRetentionDays(row?.guestLinksRetentionDays ?? TRASH_RETENTION_DEFAULT_DAYS),
    };
  } catch {
    return {
      songsRetentionDays: TRASH_RETENTION_DEFAULT_DAYS,
      usersRetentionDays: TRASH_RETENTION_DEFAULT_DAYS,
      guestLinksRetentionDays: TRASH_RETENTION_DEFAULT_DAYS,
    };
  }
}
