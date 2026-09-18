import { paymentSummarySchema } from "@/lib/validation/payment-providers";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getServiceDb } from "@/db";
import {
  paymentFulfillments,
  payments,
  plans,
  subscriptions,
} from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";

function rawReference(input: unknown): string | undefined {
  const parsed = paymentSummarySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payment provider summary");
  const raw = parsed.data;
  const data = raw?.data ?? raw;
  const meta =
    data?.custom_metadata ??
    data?.metadata ??
    data?.custom_data ??
    data?.meta ??
    {};
  return (
    meta?.app_reference ??
    data?.tx_ref ??
    data?.reference ??
    data?.merchant_reference ??
    data?.ref_command
  );
}

const currencyDecimals: Record<string, number> = {
  XOF: 0,
  XAF: 0,
  NGN: 2,
  GHS: 2,
  KES: 2,
  USD: 2,
  EUR: 2,
};
function moneyMinorUnits(amount: number, currency: string) {
  const decimals = currencyDecimals[currency.toUpperCase()] ?? 2;
  const factor = 10 ** decimals;
  return Math.round(amount * factor);
}
function sameMoney(a: number, b: number, currency: string) {
  return moneyMinorUnits(a, currency) === moneyMinorUnits(b, currency);
}

function paidDate(input: unknown, fallback: Date) {
  const parsed = paymentSummarySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payment provider summary");
  const raw = parsed.data;
  const data = raw?.data ?? raw;
  const candidates = [
    data?.settled_at,
    data?.paid_at,
    data?.completed_at,
    data?.updated_at,
    data?.created_at,
    data?.created_datetime,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(
      typeof value === "number" && value < 10_000_000_000
        ? value * 1000
        : value,
    );
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

function addCalendarPeriod(date: Date, interval: "month" | "year") {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetYear =
    interval === "year" ? year + 1 : year + Math.floor((month + 1) / 12);
  const targetMonth = interval === "year" ? month : (month + 1) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function periodEndExpression(interval: string, succeededAt: Date) {
  const base = sql`GREATEST(COALESCE(${subscriptions.currentPeriodEnd}, ${succeededAt}), ${succeededAt})`;
  return interval === "year"
    ? sql`${base} + interval '1 year'`
    : sql`${base} + interval '1 month'`;
}

/**
 * Provider state is the source of truth. Fulfilment is idempotent at DB level:
 * subscriptions.lastPaymentId + a unique (userId, planId) upsert prevent the same
 * payment from extending a subscription twice, even when webhook and cron race.
 */
export async function reconcilePayment(paymentId: string) {
  const db = getServiceDb();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!payment) throw new Error("Payment not found");
  if (!payment.providerPaymentId)
    return {
      paymentId,
      status: payment.status,
      skipped: "missing-provider-id",
    };

  const provider = getPaymentProvider(payment.provider);
  const verified = await provider.verifyPayment(payment.providerPaymentId);
  const remoteAmount = verified.money?.amount;
  const remoteCurrency = verified.money?.currency;
  const expectedAmount = payment.providerAmount ?? payment.amount;
  const expectedCurrency = payment.providerCurrency ?? payment.currency;
  const reference = rawReference(verified.raw);

  if (remoteAmount == null)
    throw new Error("Provider verification did not return amount");
  if (!remoteCurrency)
    throw new Error("Provider verification did not return currency");
  if (!sameMoney(remoteAmount, expectedAmount, expectedCurrency))
    throw new Error("Payment amount mismatch");
  if (remoteCurrency !== expectedCurrency)
    throw new Error("Payment currency mismatch");
  if (reference && reference !== payment.reference)
    throw new Error("Payment reference mismatch");

  if (verified.status === "paid") {
    const succeededAt = paidDate(verified.raw, payment.createdAt);
    await db
      .update(payments)
      .set({ status: "paid", paidAt: succeededAt })
      .where(eq(payments.id, payment.id));

    if (payment.userId && payment.planId) {
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, payment.planId))
        .limit(1);
      if (!plan) throw new Error("Payment plan not found");
      if (!["month", "year"].includes(plan.interval))
        throw new Error("Unsupported billing interval");

      await db
        .insert(subscriptions)
        .values({
          id: randomUUID(),
          userId: payment.userId,
          organizationId: payment.organizationId,
          planId: plan.id,
          provider: provider.id,
          status: "active",
          renewalMode: "manual",
          currentPeriodEnd: addCalendarPeriod(
            succeededAt,
            plan.interval as "month" | "year",
          ),
          lastPaymentId: payment.id,
        })
        .onConflictDoUpdate({
          target: [subscriptions.userId, subscriptions.planId],
          set: {
            status: "active",
            provider: provider.id,
            organizationId: payment.organizationId,
            currentPeriodEnd: periodEndExpression(plan.interval, succeededAt),
            lastPaymentId: payment.id,
          },
          setWhere: sql`${subscriptions.lastPaymentId} IS DISTINCT FROM ${payment.id}`,
        });
    }

    await db
      .insert(paymentFulfillments)
      .values({
        id: randomUUID(),
        paymentId: payment.id,
        provider: provider.id,
        appliedAt: new Date(),
      })
      .onConflictDoNothing({ target: paymentFulfillments.paymentId });
  } else if (verified.status === "failed" && payment.status !== "paid") {
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment.id));
  }

  return {
    paymentId: payment.id,
    provider: provider.id,
    status: verified.status,
  };
}
