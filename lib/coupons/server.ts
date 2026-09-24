import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";

export type CouponRow = typeof coupons.$inferSelect;

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export async function findActiveCouponByCode(code: string): Promise<CouponRow | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, normalized), eq(coupons.active, true)))
    .limit(1);
  return row ?? null;
}

export type CouponEligibility = { ok: true } | { ok: false; reason: string };

export function checkCouponEligibility(coupon: CouponRow, now: Date = new Date()): CouponEligibility {
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
    return { ok: false, reason: "Ce code a expiré." };
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "Ce code a atteint sa limite d’utilisation." };
  }
  return { ok: true };
}
