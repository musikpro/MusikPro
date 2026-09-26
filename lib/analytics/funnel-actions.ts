"use server";

import { getSession } from "@/lib/auth/session";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";

/**
 * Fired by CreationTopNav when the visitor explicitly leaves the creation flow via
 * "Tableau de bord" (not on intra-flow "Retour" navigation). Never blocks the navigation it's
 * called before — writeFunnelEvent itself is fail-safe.
 */
export async function recordCreationAbandoned(step?: string) {
  const session = await getSession();
  await writeFunnelEvent({
    event: FUNNEL_EVENT.CREATION_ABANDONED,
    userId: session?.user?.id,
    metadata: step ? { step } : undefined,
  });
}
