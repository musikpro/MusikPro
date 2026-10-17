import { randomUUID } from "node:crypto";
import { getServiceDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("audit");

export type AuditEvent = {
  action: string;
  actorId?: string;
  organizationId?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
};

/** Insère plusieurs événements en une seule requête (évite un INSERT par ligne dans une boucle — N+1). */
export async function writeAuditLogs(events: AuditEvent[]) {
  if (events.length === 0) return;
  try {
    const db = getServiceDb();
    await db
      .insert(auditLogs)
      .values(events.map((event) => ({ id: randomUUID(), ...event, metadata: event.metadata ?? {} })));
  } catch (error) {
    log.error("Audit batch write failed", {
      count: events.length,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function writeAuditLog(event: AuditEvent) {
  try {
    const db = getServiceDb();
    await db.insert(auditLogs).values({ id: randomUUID(), ...event, metadata: event.metadata ?? {} });
  } catch (error) {
    log.error("Audit write failed", {
      action: event.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
