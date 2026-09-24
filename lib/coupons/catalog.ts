export type CouponType = "percent" | "fixed";

/**
 * XOF is the app's source-of-truth currency (see lib/credit-plans/currency.ts) — `amount` and the
 * returned discount are always XOF, regardless of what the client displays after FX conversion.
 * The discount never reaches the full amount: a coupon can never bring a checkout down to zero.
 */
export function computeDiscount(amount: number, coupon: { type: CouponType; value: number }): number {
  if (amount <= 0) return 0;
  const value = coupon.type === "percent" ? Math.min(coupon.value, 100) : coupon.value;
  const raw = coupon.type === "percent" ? (amount * value) / 100 : value;
  const capped = Math.min(Math.max(0, raw), amount - 1);
  return Math.round(capped);
}
