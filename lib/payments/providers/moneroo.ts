import { monerooPayloadSchema } from "@/lib/validation/payment-providers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const BASE = "https://api.moneroo.io/v1";
const authHeaders = () => ({
  Authorization: `Bearer ${requireEnv("MONEROO_API_KEY")}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});
const safeEqual = (a: string, b: string) => {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

function normalizeStatus(value: unknown): CheckoutResult["status"] {
  const s = String(value || "").toLowerCase();
  if (["success", "successful", "completed", "paid"].some((x) => s.includes(x))) return "paid";
  if (["failed", "cancelled", "canceled", "refunded"].some((x) => s.includes(x))) return "failed";
  return "pending";
}

export class MonerooProvider extends HttpPaymentProvider {
  protected async json(url: string, init: RequestInit = {}) {
    return monerooPayloadSchema.parse(await super.json(url, init));
  }
  id = "moneroo" as const;

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.customer.email) throw new Error("Moneroo requires customer email");
    const names = (input.customer.name || input.customer.email.split("@")[0] || "Customer").trim().split(/\s+/);
    const body = await this.json(`${BASE}/payments/initialize`, {
      method: "POST",
      headers: authHeaders(),
      cache: "no-store",
      body: JSON.stringify({
        amount: input.money.amount,
        currency: input.money.currency,
        description: String(input.metadata?.description || `Payment ${input.reference}`).slice(0, 200),
        return_url: input.successUrl,
        customer: {
          email: input.customer.email,
          first_name: names[0] || "Customer",
          last_name: names.slice(1).join(" ") || "-",
          ...(input.customer.phone ? { phone: input.customer.phone } : {}),
        },
        metadata: {
          app_reference: input.reference,
          app_currency: input.money.currency,
          payment_id: String(input.metadata?.paymentId || ""),
          plan_id: String(input.metadata?.planId || ""),
        },
      }),
    });
    const data = body.data || body;
    const id = String(data.id || "");
    const checkoutUrl = String(data.checkout_url || data.link || "");
    if (!id || !checkoutUrl) throw new Error("Moneroo returned an incomplete checkout response");
    return {
      provider: this.id,
      externalId: id,
      status: "pending",
      checkoutUrl,
      money: { amount: input.money.amount, currency: input.money.currency },
      raw: body,
    };
  }

  async verifyPayment(externalId: string): Promise<CheckoutResult> {
    const body = await this.json(`${BASE}/payments/${encodeURIComponent(externalId)}/verify`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    const data = body.data || body;
    const currency = typeof data.currency === "string" ? data.currency : data.currency?.code;
    const amount = Number(data.amount);
    return {
      provider: this.id,
      externalId,
      status: normalizeStatus(data.status),
      money: Number.isFinite(amount) && currency ? { amount, currency: String(currency) } : undefined,
      raw: body,
    };
  }

  async verifyWebhook(request: Request) {
    const signature = request.headers.get("x-moneroo-signature");
    if (!signature) return false;
    const raw = await request.text();
    const expected = createHmac("sha256", requireEnv("MONEROO_WEBHOOK_SECRET")).update(raw).digest("hex");
    return safeEqual(signature, expected);
  }

  async parseWebhook(request: Request) {
    const payload = monerooPayloadSchema.parse(JSON.parse(await request.text()));
    const id = String(payload?.data?.id || "");
    if (!id) throw new Error("Moneroo webhook missing payment id");
    return {
      id: `moneroo:${payload.event || "unknown"}:${id}`,
      type: String(payload.event || "unknown"),
      payload: { ...payload, transaction: { id } },
    };
  }
}
