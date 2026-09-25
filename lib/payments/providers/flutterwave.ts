import { flutterwavePayloadSchema } from "@/lib/validation/payment-providers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";
const base = () =>
  process.env.FLUTTERWAVE_ENVIRONMENT === "live" ? "https://api.flutterwave.com/v3" : "https://api.flutterwave.com/v3";
const headers = () => ({
  Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}`,
  "Content-Type": "application/json",
});
const map = (s?: string): CheckoutResult["status"] =>
  ["successful", "succeeded"].includes((s || "").toLowerCase())
    ? "paid"
    : ["failed", "cancelled", "canceled"].includes((s || "").toLowerCase())
      ? "failed"
      : "pending";
const safe = (a: string, b: string) => {
  const A = Buffer.from(a),
    B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};
export class FlutterwaveProvider extends HttpPaymentProvider {
  protected async json(url: string, init: RequestInit = {}) {
    return flutterwavePayloadSchema.parse(await super.json(url, init));
  }
  id = "flutterwave" as const;
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.customer.email) throw new Error("Flutterwave checkout requires email");
    const body = await this.json(`${base()}/payments`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.money.amount,
        currency: input.money.currency,
        redirect_url: input.successUrl,
        customer: {
          email: input.customer.email,
          name: input.customer.name || "Client",
          phonenumber: input.customer.phone,
        },
        customizations: {
          title: process.env.APP_NAME || "Africa SaaS Kit",
          description: String(input.metadata?.description || "Abonnement SaaS"),
        },
        meta: input.metadata,
      }),
    });
    return {
      provider: this.id,
      externalId: String(body.data?.id || input.reference),
      status: "pending",
      checkoutUrl: body.data?.link,
      raw: body,
    };
  }
  async verifyPayment(externalId: string): Promise<CheckoutResult> {
    const body = await this.json(`${base()}/transactions/${encodeURIComponent(externalId)}/verify`, {
      headers: headers(),
      cache: "no-store",
    });
    const data = body.data || body;
    const amount = Number(data.amount);
    const currency = String(data.currency || "");
    return {
      provider: this.id,
      externalId: String(data.id || externalId),
      status: map(data.status),
      money: Number.isFinite(amount) && currency ? { amount, currency } : undefined,
      raw: body,
    };
  }
  async verifyWebhook(request: Request) {
    const sig = request.headers.get("flutterwave-signature");
    if (!sig) return false;
    const raw = await request.text();
    const expected = createHmac("sha256", requireEnv("FLUTTERWAVE_WEBHOOK_SECRET")).update(raw).digest("base64");
    return safe(sig, expected);
  }
  async parseWebhook(request: Request) {
    const p = flutterwavePayloadSchema.parse(JSON.parse(await request.text()));
    return {
      id: String(p.id || p.webhook_id || `${p.type}:${p.data?.id || "unknown"}`),
      type: String(p.type || p.event || "unknown"),
      payload: p,
    };
  }
}
