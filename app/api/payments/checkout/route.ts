import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getServiceDb } from "@/db";
import {
  paymentAttempts,
  payments,
  plans,
  planProviderMappings,
} from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { isSafeProviderFallbackError } from "@/lib/payments/provider-base";
import { rankProviders } from "@/lib/payments/routing";
import type { PaymentProviderId } from "@/lib/payments/types";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { writeAuditLog } from "@/lib/security/audit";
import { publicCheckoutResult } from "@/lib/payments/public-result";
import {
  rejectCrossSiteMutation,
  rejectOversizedRequest,
  requireContentType,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const schema = z.object({
  provider: z.literal("chariow").optional(),
  planId: z.string().min(1).max(120),
  country: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  method: z
    .enum([
      "wave",
      "orange_money",
      "mtn",
      "moov",
      "free_money",
      "t_money",
      "m_pesa",
      "bank_transfer",
      "mobile_money",
      "card",
    ])
    .optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  phone: z.string().min(6).max(30).optional(),
  phoneCountry: z.string().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()).optional(),
  phoneLocal: z.string().min(4).max(30).optional(),
});

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 64 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  const db = getServiceDb();
  const level = getSecurityLevel();
  const ip = clientIp(request);
  const limit = await rateLimit(
    `checkout:${session.user.id}:${ip}`,
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
  const body = parsed.data;
  const country = body.country ?? process.env.DEFAULT_COUNTRY?.toUpperCase();
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV === "production" && !configuredAppUrl)
    return Response.json(
      { error: "Application URL is not configured" },
      { status: 503 },
    );
  const appOrigin = new URL(configuredAppUrl || "http://localhost:3000").origin;
  if (
    new URL(body.successUrl).origin !== appOrigin ||
    new URL(body.cancelUrl).origin !== appOrigin
  )
    return Response.json(
      { error: "Redirect URLs must use the application origin" },
      { status: 400 },
    );

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, body.planId))
    .limit(1);
  if (!plan?.active)
    return Response.json({ error: "Plan unavailable" }, { status: 404 });

  let ranked = await rankProviders(country, body.method, plan.currency);
  if (body.provider)
    ranked = ranked.filter((x) => x.provider === body.provider);
  ranked = ranked.filter((x) => !x.degraded);
  if (!ranked.length)
    return Response.json(
      { error: "No healthy compatible payment provider available" },
      { status: 503 },
    );

  const paymentId = randomUUID();
  const reference = `ask_${randomUUID()}`;
  // Store a neutral pending payment first; provider is set when a checkout succeeds.
  await db.insert(payments).values({
    id: paymentId,
    userId: session.user.id,
    planId: plan.id,
    provider: ranked[0].provider,
    reference,
    amount: plan.amount,
    currency: plan.currency,
    status: "pending",
    country,
    method: body.method,
    metadata: {
      source: "pricing",
      routerCandidates: ranked.map((x) => x.provider),
    },
  });

  const failures: Array<{ provider: string; message: string }> = [];
  for (const candidate of ranked) {
    const providerId = candidate.provider as PaymentProviderId;
    const attemptId = randomUUID();
    const started = Date.now();
    await db.insert(paymentAttempts).values({
      id: attemptId,
      paymentId,
      provider: providerId,
      country,
      method: body.method,
      outcome: "selected",
      metadata: {
        routerScore: candidate.score,
        priority: candidate.priority,
        successRate: candidate.successRate,
        degradedWindowAttempts: candidate.degradedWindowAttempts,
        degradedWindowSuccessRate: candidate.degradedWindowSuccessRate,
      },
    });
    try {
      const [mapping] = await db
        .select()
        .from(planProviderMappings)
        .where(
          and(
            eq(planProviderMappings.planId, plan.id),
            eq(planProviderMappings.provider, providerId),
          ),
        )
        .limit(1);
      const result = await getPaymentProvider(providerId).createCheckout({
        reference,
        money: {
          amount: plan.amount,
          currency:
            plan.currency as import("@/lib/payments/types").Money["currency"],
        },
        customer: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          phone: body.phone,
        },
        country,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        metadata: {
          paymentId,
          planId: plan.id,
          description: `${plan.name} — ${process.env.APP_NAME ?? "Africa SaaS Kit"}`,
        },
        providerContext: {
          externalProductId: mapping?.externalProductId,
          paymentMethod: body.method,
          phoneCountry: body.phoneCountry,
          phoneLocal: body.phoneLocal,
          ...((mapping?.metadata as Record<string, unknown>) || {}),
        },
      });
      await db
        .update(paymentAttempts)
        .set({ outcome: "checkout_created", latencyMs: Date.now() - started })
        .where(eq(paymentAttempts.id, attemptId));
      await db
        .update(payments)
        .set({
          provider: providerId,
          providerPaymentId: result.externalId,
          providerAmount: result.money?.amount,
          providerCurrency: result.money?.currency,
        })
        .where(eq(payments.id, paymentId));
      await writeAuditLog({
        action: "payment.checkout.created",
        actorId: session.user.id,
        targetType: "payment",
        targetId: paymentId,
        ip,
        metadata: {
          provider: providerId,
          planId: plan.id,
          routerScore: candidate.score,
          fallbackCount: failures.length,
        },
      });
      return Response.json(
        {
          ...publicCheckoutResult(result),
          router: {
            selected: providerId,
            fallbacks: failures.map((f) => f.provider),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown provider error";
      const safeFallback = isSafeProviderFallbackError(error);
      failures.push({ provider: providerId, message });
      await db
        .update(paymentAttempts)
        .set({
          outcome: "provider_error",
          latencyMs: Date.now() - started,
          errorMessage: message.slice(0, 500),
          metadata: { safeFallback },
        })
        .where(eq(paymentAttempts.id, attemptId));
      await writeAuditLog({
        action: "payment.checkout.provider_failed",
        actorId: session.user.id,
        targetType: "payment",
        targetId: paymentId,
        ip,
        metadata: {
          provider: providerId,
          message: message.slice(0, 200),
          safeFallback,
        },
      });

      if (body.provider || !safeFallback) {
        // An ambiguous network/5xx/incomplete-response failure may have created a checkout remotely.
        // Never create a second checkout at another provider in that situation.
        await db
          .update(payments)
          .set({
            provider: providerId,
            status: safeFallback ? "failed" : "uncertain",
            metadata: {
              source: "pricing",
              routerFailures: failures.map((f) => ({
                provider: f.provider,
                message: f.message.slice(0, 120),
              })),
              ambiguousProviderState: !safeFallback,
            },
          })
          .where(eq(payments.id, paymentId));
        return Response.json(
          {
            error: safeFallback
              ? "Payment provider rejected checkout"
              : "Payment provider response is uncertain; automatic fallback was stopped to prevent duplicate checkout creation",
            provider: providerId,
            retryable: safeFallback,
          },
          { status: safeFallback ? 502 : 503 },
        );
      }
    }
  }

  await db
    .update(payments)
    .set({
      status: "failed",
      metadata: {
        source: "pricing",
        routerFailures: failures.map((f) => ({
          provider: f.provider,
          message: f.message.slice(0, 120),
        })),
      },
    })
    .where(eq(payments.id, paymentId));
  return Response.json(
    {
      error: "All compatible payment providers safely rejected checkout",
      providersTried: failures.map((f) => f.provider),
    },
    { status: 502 },
  );
}
