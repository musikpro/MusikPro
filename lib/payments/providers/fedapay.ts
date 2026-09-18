import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const baseUrl = () => process.env.FEDAPAY_ENVIRONMENT === "live"
  ? "https://api.fedapay.com/v1"
  : "https://sandbox-api.fedapay.com/v1";

function statusOf(value?: string): CheckoutResult["status"] {
  if (value === "approved") return "paid";
  if (["canceled", "declined", "refunded"].includes(value ?? "")) return "failed";
  return "pending";
}

export class FedapayProvider extends HttpPaymentProvider {
  id = "fedapay" as const;

  private headers() {
    return { Authorization: `Bearer ${requireEnv("FEDAPAY_SECRET_KEY")}`, "Content-Type": "application/json" };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const transaction = await this.json(`${baseUrl()}/transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        description: String(input.metadata?.description ?? `Paiement ${input.reference}`),
        amount: input.money.amount,
        currency: { iso: input.money.currency },
        callback_url: input.successUrl,
        custom_metadata: {
          app_reference: input.reference,
          app_currency: input.money.currency,
          user_id: input.customer.id,
          country: input.country,
          ...input.metadata,
        },
      }),
      cache: "no-store",
    }) as { id: number; status?: string };

    const token = await this.json(`${baseUrl()}/transactions/${transaction.id}/token`, {
      method: "POST",
      headers: this.headers(),
      cache: "no-store",
    }) as { url: string };

    return { provider: this.id, externalId: String(transaction.id), status: statusOf(transaction.status), checkoutUrl: token.url, raw: transaction };
  }

  async verifyPayment(externalId: string): Promise<CheckoutResult> {
    if (!/^\d+$/.test(externalId)) throw new Error("Invalid FedaPay transaction id");
    const transaction = await this.json(`${baseUrl()}/transactions/${externalId}`, {
      headers: this.headers(), cache: "no-store",
    }) as { id: number; status?: string; amount?: number; custom_metadata?: Record<string, unknown>; currency?: { iso?: string }; currency_iso?: string };
    const currency = String(transaction.currency?.iso ?? transaction.currency_iso ?? transaction.custom_metadata?.app_currency ?? "");
    const amount = Number(transaction.amount);
    return {
      provider: this.id, externalId: String(transaction.id), status: statusOf(transaction.status),
      money: Number.isFinite(amount) && currency ? { amount, currency } : undefined, raw: transaction,
    };
  }

  private async constructEvent(request: Request) {
    const signature = request.headers.get("x-fedapay-signature");
    if (!signature) throw new Error("Missing X-FEDAPAY-SIGNATURE");
    const raw = Buffer.from(await request.arrayBuffer());
    const secret = requireEnv("FEDAPAY_WEBHOOK_SECRET");
    const sdk = await import("fedapay");
    return sdk.Webhook.constructEvent(raw, signature, secret) as unknown as Record<string, any>;
  }

  async verifyWebhook(request: Request): Promise<boolean> {
    try { await this.constructEvent(request); return true; } catch { return false; }
  }

  async parseWebhook(request: Request) {
    const event = await this.constructEvent(request);
    const entity = event.entity ?? event.data ?? event.object ?? {};
    const id = String(event.id ?? `${event.name ?? event.type}:${entity.id ?? entity.reference ?? "unknown"}`);
    const type = String(event.name ?? event.type ?? "unknown");
    return { id, type, payload: event };
  }
}
