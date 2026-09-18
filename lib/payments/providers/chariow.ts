import { chariowPayloadSchema } from "@/lib/validation/payment-providers";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const BASE = process.env.CHARIOW_API_URL || "https://api.chariow.com/v1";
const headers = () => ({
  Authorization: `Bearer ${requireEnv("CHARIOW_API_KEY")}`,
  "Content-Type": "application/json",
});
const safeEqual = (a: string, b: string) => {
  try {
    const A = Buffer.from(a);
    const B = Buffer.from(b);
    return A.length === B.length && timingSafeEqual(A, B);
  } catch {
    return false;
  }
};

function mapStatus(value: unknown): CheckoutResult["status"] {
  const s = String(value || "").toLowerCase();
  // Important: "unpaid" contains "paid". Test it before paid/success patterns.
  if (s.includes("unpaid")) return "pending";
  if (/failed|error|cancel|abandon|refund/.test(s)) return "failed";
  if (/settle|complete|paid|success/.test(s)) return "paid";
  return "pending";
}

function resolvePhone(
  rawPhone: string | undefined,
  country: string | undefined,
) {
  if (!rawPhone) throw new Error("Chariow checkout requires customer phone");
  const cc = (country || "CI").toUpperCase() as CountryCode;
  const parsed = rawPhone.trim().startsWith("+")
    ? parsePhoneNumberFromString(rawPhone.trim())
    : parsePhoneNumberFromString(rawPhone.trim(), cc);
  if (parsed?.isValid()) {
    return {
      number: parsed.nationalNumber,
      country_code: parsed.country || cc,
    };
  }
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) throw new Error("Invalid Chariow phone number");
  return { number: digits.replace(/^0+/, ""), country_code: cc };
}

export class ChariowProvider extends HttpPaymentProvider {
  protected async json(url: string, init: RequestInit = {}) {
    return chariowPayloadSchema.parse(await super.json(url, init));
  }
  id = "chariow" as const;
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const productId = String(
      input.providerContext?.externalProductId ||
        input.metadata?.chariowProductId ||
        "",
    );
    if (!productId)
      throw new Error("Chariow requires a product mapping for this plan");
    if (!input.customer.email)
      throw new Error("Chariow checkout requires customer email");
    const names = (input.customer.name || "Client SaaS").trim().split(/\s+/);
    const phone = resolvePhone(input.customer.phone, input.country);
    const body = await this.json(`${BASE}/checkout`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({
        product_id: productId,
        email: input.customer.email,
        first_name: names[0] || "Client",
        last_name: names.slice(1).join(" ") || "SaaS",
        phone,
        payment_currency: input.money.currency,
        redirect_url: input.successUrl,
        custom_metadata: {
          app_reference: input.reference,
          app_currency: input.money.currency,
          payment_id: String(input.metadata?.paymentId || ""),
          plan_id: String(input.metadata?.planId || ""),
        },
      }),
    });
    const data = body.data || body;
    const amount = Number(data.purchase?.amount?.value);
    const currency = String(data.purchase?.amount?.currency || "");
    const id = String(data.purchase?.id || data.payment?.transaction_id || "");
    const checkoutUrl = data.payment?.checkout_url || undefined;
    if (!id || !checkoutUrl)
      throw new Error("Chariow returned an incomplete checkout response");
    return {
      provider: this.id,
      externalId: id,
      status: mapStatus(
        typeof data.purchase?.status === "object"
          ? data.purchase.status.value
          : data.purchase?.status || data.step,
      ),
      checkoutUrl,
      money:
        Number.isFinite(amount) && currency ? { amount, currency } : undefined,
      raw: body,
    };
  }
  async verifyPayment(externalId: string): Promise<CheckoutResult> {
    const body = await this.json(
      `${BASE}/sales/${encodeURIComponent(externalId)}`,
      { headers: headers(), cache: "no-store" },
    );
    const sale = body.data || body;
    const detail = typeof sale.amount === "object" ? sale.amount : undefined;
    const amount = Number(detail?.value ?? sale.amount);
    const currency = String(detail?.currency ?? sale.currency ?? "");
    return {
      provider: this.id,
      externalId,
      status: mapStatus(
        typeof sale.status === "object" ? sale.status.value : sale.status,
      ),
      money:
        Number.isFinite(amount) && currency ? { amount, currency } : undefined,
      raw: body,
    };
  }
  async verifyWebhook(request: Request) {
    // Current public Chariow best-practices documentation describes HMAC-SHA256
    // via x-chariow-signature. We still re-pull GET /sales/{id} before fulfilment.
    const signature = request.headers.get("x-chariow-signature");
    if (!signature) return false;
    const raw = await request.text();
    const expected = createHmac("sha256", requireEnv("CHARIOW_WEBHOOK_SECRET"))
      .update(raw)
      .digest("hex");
    const received = signature.toLowerCase().startsWith("sha256=")
      ? signature.slice(7)
      : signature;
    return safeEqual(received, expected);
  }
  async parseWebhook(request: Request) {
    const deliveryId = request.headers.get("x-pulse-delivery-id");
    const payload = chariowPayloadSchema.parse(
      JSON.parse(await request.text()),
    );
    const entity = payload.sale || payload.license || payload.affiliate || {};
    const id = String(entity.id || payload.data?.id || "");
    if (!id) throw new Error("Chariow Pulse missing sale id");
    return {
      id: deliveryId
        ? `chariow:${deliveryId}`
        : `chariow:${payload.event || "unknown"}:${id}`,
      type: String(payload.event || "unknown"),
      payload: { ...payload, transaction: { id } },
    };
  }
}
