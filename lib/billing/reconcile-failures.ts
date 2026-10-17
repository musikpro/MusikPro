import "server-only";

import { and, eq, gte, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { type AuditEvent, writeAuditLogs } from "@/lib/security/audit";

export const RECONCILE_FAILED_ACTION = "payment.reconcile.failed";
/** Un même paiement en échec n'est journalisé qu'une fois par période : le cron repasse souvent sur les mêmes. */
export const RECONCILE_FAILURE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ReconcileFailure = { paymentId: string; error: string };

/** Garde uniquement les échecs dont le paiement n'a pas déjà été journalisé récemment (fonction pure, testée). */
export function selectNewFailures(failures: ReconcileFailure[], alreadyLoggedIds: Set<string>): ReconcileFailure[] {
  const seen = new Set(alreadyLoggedIds);
  return failures.filter((failure) => {
    if (seen.has(failure.paymentId)) return false;
    seen.add(failure.paymentId);
    return true;
  });
}

/**
 * Journalise les échecs de réconciliation en une requête de lecture + une d'insertion (au lieu d'un INSERT par
 * paiement à chaque passage du cron), sans répéter un paiement déjà journalisé dans la période. Renvoie le nombre
 * de lignes écrites.
 */
export async function logReconcileFailures(failures: ReconcileFailure[], now = Date.now()): Promise<number> {
  if (failures.length === 0) return 0;
  const database = getServiceDb();
  const recent = await database
    .select({ targetId: auditLogs.targetId })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, RECONCILE_FAILED_ACTION),
        inArray(
          auditLogs.targetId,
          failures.map((failure) => failure.paymentId),
        ),
        gte(auditLogs.createdAt, new Date(now - RECONCILE_FAILURE_COOLDOWN_MS)),
      ),
    );
  const alreadyLogged = new Set(recent.flatMap((row) => (row.targetId ? [row.targetId] : [])));
  const fresh = selectNewFailures(failures, alreadyLogged);
  const events: AuditEvent[] = fresh.map((failure) => ({
    action: RECONCILE_FAILED_ACTION,
    targetType: "payment",
    targetId: failure.paymentId,
    metadata: { error: failure.error },
  }));
  await writeAuditLogs(events);
  return events.length;
}
