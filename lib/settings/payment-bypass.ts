import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentBypassSettings } from "@/db/schema";

export type PaymentBypassStatus = { enabled: boolean; enabledAt: Date | null };

/** Global admin-only toggle: while enabled, real accounts can generate without credits or an active payment provider. */
export async function getPaymentBypassStatus(): Promise<PaymentBypassStatus> {
  const [row] = await db
    .select({ enabled: paymentBypassSettings.enabled, enabledAt: paymentBypassSettings.enabledAt })
    .from(paymentBypassSettings)
    .where(eq(paymentBypassSettings.id, "global"))
    .limit(1);
  return { enabled: Boolean(row?.enabled), enabledAt: row?.enabledAt ?? null };
}

export async function isPaymentBypassEnabled(): Promise<boolean> {
  try {
    return (await getPaymentBypassStatus()).enabled;
  } catch {
    return false;
  }
}
