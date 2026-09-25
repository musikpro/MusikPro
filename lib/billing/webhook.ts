import { paymentSummarySchema } from "@/lib/validation/payment-providers";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, webhookEvents } from "@/db/schema";
import type { PaymentProvider } from "@/lib/payments/types";
import { reconcilePayment } from "@/lib/billing/reconcile";

function eventTransactionId(input: unknown): string | undefined {
  const parsed = paymentSummarySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payment provider summary");
  const payload = parsed.data;
  const entity = payload?.transaction ?? payload?.entity ?? payload?.data ?? payload?.object ?? payload?.sale;
  const value = entity?.id ?? payload?.transactionId ?? payload?.chargeId ?? payload?.token;
  return value == null ? undefined : String(value);
}

function eventReference(input: unknown): string | undefined {
  const parsed = paymentSummarySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payment provider summary");
  const payload = parsed.data;
  const data = payload?.data ?? payload;
  const metadata = data?.custom_metadata ?? data?.metadata ?? data?.custom_data ?? data?.meta ?? {};
  return (
    metadata?.app_reference ??
    data?.tx_ref ??
    data?.reference ??
    data?.merchant_reference ??
    data?.ref_command ??
    data?.paymentReference
  );
}

function eventStatus(input: unknown): string | undefined {
  const parsed = paymentSummarySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payment provider summary");
  const payload = parsed.data;
  const data = payload?.data ?? payload;
  const value = data?.status ?? data?.payment_status ?? data?.state;
  return value == null ? undefined : String(value).slice(0, 80);
}

/** Persist only a compact event summary. Raw gateway payloads can contain PII and should
 * not become a long-lived shadow copy of provider data in our database. */
function storedEventSummary(payload: unknown) {
  return {
    transactionId: eventTransactionId(payload),
    reference: eventReference(payload),
    status: eventStatus(payload),
  };
}

export async function processPaymentWebhook(
  provider: PaymentProvider,
  event: { id: string; type: string; payload: unknown },
) {
  const db = getServiceDb();
  const externalId = eventTransactionId(event.payload);
  const reference = eventReference(event.payload);

  await db
    .insert(webhookEvents)
    .values({
      id: randomUUID(),
      provider: provider.id,
      externalEventId: event.id,
      type: event.type.slice(0, 120),
      payload: storedEventSummary(event.payload),
    })
    .onConflictDoNothing();

  const [stored] = await db
    .select()
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, provider.id), eq(webhookEvents.externalEventId, event.id)))
    .limit(1);
  if (!stored || stored.processed) return { duplicate: true };

  let payment;
  if (externalId) {
    [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider.id), eq(payments.providerPaymentId, externalId)))
      .limit(1);
  }
  if (!payment && reference) {
    [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider.id), eq(payments.reference, String(reference))))
      .limit(1);
  }
  if (!payment) throw new Error("Payment not found for webhook");

  // Some hosted checkouts (notably Flutterwave) only expose the final transaction ID
  // in the webhook. Bind it only if our local payment does not already point elsewhere.
  if (externalId && payment.providerPaymentId !== externalId) {
    if (payment.providerPaymentId && payment.providerPaymentId !== payment.reference) {
      throw new Error("Webhook transaction id does not match stored provider id");
    }
    await db
      .update(payments)
      .set({ providerPaymentId: externalId })
      .where(
        and(
          eq(payments.id, payment.id),
          or(isNull(payments.providerPaymentId), eq(payments.providerPaymentId, payment.reference)),
        ),
      );
    payment = { ...payment, providerPaymentId: externalId };
  }

  // Zero trust in webhook payload: fulfilment always re-pulls provider state.
  const result = await reconcilePayment(payment.id);
  await db.update(webhookEvents).set({ processed: true }).where(eq(webhookEvents.id, stored.id));
  return { duplicate: false, ...result };
}
