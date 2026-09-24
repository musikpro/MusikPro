import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { computeDiscount } from "@/lib/coupons/catalog";
import { checkCouponEligibility, findActiveCouponByCode } from "@/lib/coupons/server";
import { couponCodeSchema } from "@/lib/validation/coupons";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import {
  rejectCrossSiteMutation,
  rejectOversizedRequest,
  requireContentType,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const schema = z.object({
  code: couponCodeSchema,
  planId: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 4 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  const level = getSecurityLevel();
  const ip = clientIp(request);
  const limit = await rateLimit(
    `coupon-apply:${session.user.id}:${ip}`,
    securityPolicy[level].apiPerMinute,
  );
  if (limit.backend === "unavailable")
    return Response.json(
      { error: "Security rate-limit backend unavailable" },
      { status: 503 },
    );
  if (!limit.success)
    return Response.json({ error: "Too many requests" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );

  const [plan] = await db.select().from(plans).where(eq(plans.id, parsed.data.planId)).limit(1);
  if (!plan?.active)
    return Response.json({ error: "Plan unavailable" }, { status: 404 });

  const coupon = await findActiveCouponByCode(parsed.data.code);
  if (!coupon)
    return Response.json(
      { valid: false, reason: "Ce code n’existe pas ou n’est plus actif." },
      { headers: { "Cache-Control": "no-store" } },
    );
  const eligibility = checkCouponEligibility(coupon);
  if (!eligibility.ok)
    return Response.json(
      { valid: false, reason: eligibility.reason },
      { headers: { "Cache-Control": "no-store" } },
    );

  const discountAmount = computeDiscount(plan.amount, { type: coupon.type as "percent" | "fixed", value: coupon.value });
  return Response.json(
    {
      valid: true,
      code: coupon.code,
      discountAmount,
      finalAmount: plan.amount - discountAmount,
      currency: plan.currency,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
