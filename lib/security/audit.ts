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

export async function writeAuditLog(event: AuditEvent) {
  try {
    const db = getServiceDb();
    await db
      .insert(auditLogs)
      .values({ id: randomUUID(), ...event, metadata: event.metadata ?? {} });
  } catch (error) {
    log.error("Audit write failed", {
      action: event.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
