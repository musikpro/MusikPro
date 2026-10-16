import "server-only";

import { eq } from "drizzle-orm";
import { db, getServiceDb } from "@/db";
import { maintenanceSettings } from "@/db/schema";

export type MaintenanceStatus = {
  enabled: boolean;
  message: string | null;
  enabledAt: Date | null;
};

const OFF: MaintenanceStatus = { enabled: false, message: null, enabledAt: null };

/** État courant (page publique /maintenance et page admin). Une erreur de lecture vaut « pas en maintenance ». */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const [row] = await db
      .select({
        enabled: maintenanceSettings.enabled,
        message: maintenanceSettings.message,
        enabledAt: maintenanceSettings.enabledAt,
      })
      .from(maintenanceSettings)
      .where(eq(maintenanceSettings.id, "global"))
      .limit(1);
    return row ? { enabled: row.enabled, message: row.message, enabledAt: row.enabledAt } : OFF;
  } catch {
    return OFF;
  }
}

/** Bascule (Server Action admin uniquement). Garde l'heure d'activation d'origine quand on ne fait que changer le message. */
export async function saveMaintenance(input: {
  enabled: boolean;
  message: string | null;
  actorId: string;
}): Promise<{ wasEnabled: boolean }> {
  const database = getServiceDb();
  const [current] = await database
    .select({ enabled: maintenanceSettings.enabled, enabledAt: maintenanceSettings.enabledAt })
    .from(maintenanceSettings)
    .where(eq(maintenanceSettings.id, "global"))
    .limit(1);
  const wasEnabled = Boolean(current?.enabled);
  const now = new Date();
  const fields = {
    enabled: input.enabled,
    message: input.message,
    enabledBy: input.enabled ? input.actorId : null,
    enabledAt: input.enabled ? (wasEnabled ? (current?.enabledAt ?? now) : now) : null,
    updatedAt: now,
  };
  await database
    .insert(maintenanceSettings)
    .values({ id: "global", ...fields })
    .onConflictDoUpdate({ target: maintenanceSettings.id, set: fields });
  return { wasEnabled };
}
