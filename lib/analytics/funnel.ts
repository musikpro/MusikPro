import { randomUUID } from "node:crypto";
import { getServiceDb } from "@/db";
import { funnelEvents } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("funnel");

/** Known funnel step names — see db/schema/index.ts's funnelEvents table doc comment. */
export const FUNNEL_EVENT = {
  SITE_VISIT: "site_visit",
  CREATION_STARTED: "creation_started",
  CREATION_ABANDONED: "creation_abandoned",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENT)[keyof typeof FUNNEL_EVENT];

export type FunnelEventInput = {
  event: FunnelEventName;
  userId?: string;
  metadata?: Record<string, unknown>;
};

/** Fail-safe, non-blocking write — mirrors lib/security/audit.ts's writeAuditLog. */
export async function writeFunnelEvent(event: FunnelEventInput) {
  try {
    const db = getServiceDb();
    await db.insert(funnelEvents).values({ id: randomUUID(), ...event, metadata: event.metadata ?? {} });
  } catch (error) {
    log.error("Funnel event write failed", {
      event: event.event,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
