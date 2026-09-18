import { paytechPayloadSchema } from "@/lib/validation/payment-providers";
import { paymentWebhookUrl } from "@/lib/payments/webhook-url";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const BASE = "https://paytech.sn/api";
const headers = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  API_KEY: requireEnv("PAYTECH_API_KEY"),
  API_SECRET: requireEnv("PAYTECH_API_SECRET"),
});
const safe = (a: string, b: string) => {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};
const statusOf = (v: unknown): CheckoutResult["status"] => {
  const s = String(v || "").toLowerCase();
  if (s.includes("complete") || s.includes("success")) return "paid";
  if (s.includes("fail") || s.includes("cancel") || s.includes("refund"))
    return "failed";
  return "pending";
};

export class PaytechProvider extends HttpPaymentProvider {
  protected async json(url: string, init: RequestInit = {}) {
    return paytechPayloadSchema.parse(await super.json(url, init));
  }
  id = "paytech" as const;
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (input.money.currency !== "XOF")
      throw new Error("PayTech adapter currently accepts XOF only");
    const ipnUrl = paymentWebhookUrl("paytech");
    if (process.env.NODE_ENV === "production" && !ipnUrl.startsWith("https://"))
      throw new Error("PayTech IPN must use HTTPS in production");
    const body = await this.json(`${BASE}/payment/request-payment`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({
        item_name: String(
          input.metadata?.description || "Africa SaaS plan",
        ).slice(0, 120),
        item_price: input.money.amount,
        currency: "XOF",
        ref_command: input.reference,
        command_name: String(
          input.metadata?.description || `Payment ${input.reference}`,
        ).slice(0, 200),
        env: process.env.PAYTECH_ENVIRONMENT === "prod" ? "prod" : "test",
        ipn_url: ipnUrl,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        custom_field: JSON.stringify({
          app_reference: input.reference,
          payment_id: input.metadata?.paymentId,
          plan_id: input.metadata?.planId,
          customer_email: input.customer.email,
        }),
      }),
    });
    if (Number(body.success) !== 1 || !body.token)
      throw new Error(
        `PayTech checkout rejected: ${body.message || "unknown"}`,
      );
    const checkoutUrl = body.redirect_url || body.redirectUrl;
    if (!checkoutUrl) throw new Error("PayTech response missing redirect_url");
    return {
      provider: this.id,
      externalId: String(body.token),
      status: "pending",
      checkoutUrl: String(checkoutUrl),
      money: { amount: input.money.amount, currency: "XOF" },
      raw: body,
    };
  }
  async verifyPayment(token: string): Promise<CheckoutResult> {
    const response = await fetch(
      `${BASE}/payment/get-status?token_payment=${encodeURIComponent(token)}`,
      { headers: headers(), cache: "no-store" },
    );
    const body = paytechPayloadSchema.parse(
      await response.json().catch(() => ({})),
    );
    if (!response.ok)
      throw new Error(`PayTech verify error ${response.status}`);
    const rawStatus = body.status || body.payment_status || body.data?.status;
    const amount = Number(body.item_price ?? body.amount ?? body.data?.amount);
    const currency = String(body.currency ?? body.data?.currency ?? "XOF");
    return {
      provider: this.id,
      externalId: token,
      status: statusOf(rawStatus),
      money: Number.isFinite(amount) ? { amount, currency } : undefined,
      raw: body,
    };
  }
  private async payload(request: Request) {
    const type = request.headers.get("content-type") || "";
    if (type.includes("application/json"))
      return paytechPayloadSchema.parse(await request.json());
    const form = await request.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) out[k] = String(v);
    return paytechPayloadSchema.parse(out);
  }
  async verifyWebhook(request: Request) {
    try {
      const p = await this.payload(request);
      const key = requireEnv("PAYTECH_API_KEY");
      const secret = requireEnv("PAYTECH_API_SECRET");
      if (p.hmac_compute) {
        const expected = createHmac("sha256", secret)
          .update(`${p.item_price}|${p.ref_command}|${key}`)
          .digest("hex");
        if (safe(String(p.hmac_compute), expected)) return true;
      }
      const kh = createHash("sha256").update(key).digest("hex");
      const sh = createHash("sha256").update(secret).digest("hex");
      return (
        safe(String(p.api_key_sha256 || ""), kh) &&
        safe(String(p.api_secret_sha256 || ""), sh)
      );
    } catch {
      return false;
    }
  }
  async parseWebhook(request: Request) {
    const p = await this.payload(request);
    const token = String(p.token || "");
    if (!token) throw new Error("PayTech IPN missing token");
    return {
      id: `paytech:${token}:${p.type_event || "unknown"}`,
      type: String(p.type_event || "unknown"),
      payload: { ...p, transaction: { id: token }, reference: p.ref_command },
    };
  }
}
