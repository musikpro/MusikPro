import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, plans } from "@/db/schema";

export type CreditHistoryEntry = {
  /** ISO date of the purchase (paid_at, falling back to created_at). */
  date: string;
  /** Plan name, kept in French: it is the canonical catalogue key and is localised at display time. */
  planName: string;
  credits: number;
  type: "purchase";
};

/** Real credit purchases of the signed-in customer (paid payments only), newest first. */
export async function getCreditPurchaseHistory(userId: string, limit = 20): Promise<CreditHistoryEntry[]> {
  const rows = await getServiceDb()
    .select({
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      planName: plans.name,
      features: plans.features,
    })
    .from(payments)
    .innerJoin(plans, eq(plans.id, payments.planId))
    .where(and(eq(payments.userId, userId), eq(payments.status, "paid")))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt))
    .limit(limit);
  return rows.map((row) => {
    const credits = Number((row.features as { credits?: unknown } | null)?.credits ?? 0);
    return {
      date: (row.paidAt ?? row.createdAt).toISOString(),
      planName: row.planName,
      credits: Number.isFinite(credits) ? credits : 0,
      type: "purchase" as const,
    };
  });
}
