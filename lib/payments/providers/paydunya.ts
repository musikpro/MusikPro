import { paydunyaPayloadSchema } from "@/lib/validation/payment-providers";
import { paymentWebhookUrl } from "@/lib/payments/webhook-url";
import { createHash, timingSafeEqual } from "node:crypto";
import { HttpPaymentProvider } from "../provider-base";
import type { CheckoutInput, CheckoutResult } from "../types";
import { requireEnv } from "@/lib/security/env";

const baseUrl = () =>
  process.env.PAYDUNYA_ENVIRONMENT === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

const statusOf = (status?: string): CheckoutResult["status"] => {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "paid";
  if (["cancelled", "canceled", "failed"].includes(value)) return "failed";
  return "pending";
};

const safeEqual = (a: string, b: string) => {
  const A = Buffer.from(a.toLowerCase());
  const B = Buffer.from(b.toLowerCase());
  return A.length === B.length && timingSafeEqual(A, B);
};

export class PaydunyaProvider extends HttpPaymentProvider {
  protected async json(url: string, init: RequestInit = {}) {
    return paydunyaPayloadSchema.parse(await super.json(url, init));
  }
  id = "paydunya" as const;

  private headers() {
    return {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": requireEnv("PAYDUNYA_MASTER_KEY"),
      "PAYDUNYA-PRIVATE-KEY": requireEnv("PAYDUNYA_PRIVATE_KEY"),
      "PAYDUNYA-TOKEN": requireEnv("PAYDUNYA_TOKEN"),
    };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (input.money.currency !== "XOF")
      throw new Error(
        "PayDunya starter route is configured for XOF; validate other currencies with your merchant account before enabling them.",
      );
    const callbackUrl = paymentWebhookUrl("paydunya");
    const body = await this.json(`${baseUrl()}/checkout-invoice/create`, {
      method: "POST",
      headers: this.headers(),
      cache: "no-store",
      body: JSON.stringify({
        invoice: {
          total_amount: input.money.amount,
          description: String(
            input.metadata?.description ?? `Paiement ${input.reference}`,
          ),
          customer: {
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
        },
        store: {
          name: process.env.APP_NAME || "Africa SaaS Kit",
          website_url: process.env.NEXT_PUBLIC_APP_URL,
        },
        custom_data: {
          app_reference: input.reference,
          app_currency: input.money.currency,
          payment_id: input.metadata?.paymentId,
          plan_id: input.metadata?.planId,
          country: input.country,
        },
        actions: {
          cancel_url: input.cancelUrl,
          return_url: input.successUrl,
          callback_url: callbackUrl,
        },
      }),
    });
    if (
      String(body.response_code) !== "00" ||
      !body.token ||
      !body.response_text
    )
      throw new Error(
        `PayDunya checkout rejected: ${body.description || body.response_text || "unknown"}`,
      );
    return {
      provider: this.id,
      externalId: String(body.token),
      status: "pending",
      checkoutUrl: String(body.response_text),
      raw: body,
    };
  }

  async verifyPayment(externalId: string): Promise<CheckoutResult> {
    if (!/^[A-Za-z0-9_-]{6,200}$/.test(externalId))
      throw new Error("Invalid PayDunya invoice token");
    const body = await this.json(
      `${baseUrl()}/checkout-invoice/confirm/${encodeURIComponent(externalId)}`,
      {
        headers: this.headers(),
        cache: "no-store",
      },
    );
    const custom = body.custom_data || body.customData || {};
    const normalized = {
      ...body,
      amount: Number(body.invoice?.total_amount ?? body.invoice?.totalAmount),
      currency: body.currency || body.invoice?.currency || "XOF",
      reference: custom.app_reference,
      metadata: custom,
    };
    return {
      provider: this.id,
      externalId,
      status: statusOf(body.status),
      money:
        Number.isFinite(normalized.amount) && normalized.currency
          ? { amount: normalized.amount, currency: String(normalized.currency) }
          : undefined,
      raw: normalized,
    };
  }

  private async payload(request: Request) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json"))
      return paydunyaPayloadSchema.parse(await request.json());
    const form = await request.formData();
    const obj: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) obj[key] = value;
    if (typeof obj.data === "string") {
      try {
        obj.data = JSON.parse(obj.data);
      } catch {
        /* keep raw */
      }
    }
    return paydunyaPayloadSchema.parse(obj);
  }

  async verifyWebhook(request: Request): Promise<boolean> {
    try {
      const payload = await this.payload(request);
      const data = payload?.data ?? payload;
      const received = String(data?.hash ?? payload?.hash ?? "");
      if (!received) return false;
      const expected = createHash("sha512")
        .update(requireEnv("PAYDUNYA_MASTER_KEY"))
        .digest("hex");
      return safeEqual(received, expected);
    } catch {
      return false;
    }
  }

  async parseWebhook(request: Request) {
    const payload = await this.payload(request);
    const data = payload?.data ?? payload;
    const token = String(
      data?.invoice?.token ?? data?.token ?? data?.invoice_token ?? "",
    );
    if (!token) throw new Error("PayDunya IPN missing invoice token");
    const status = String(data?.status ?? "unknown");
    return {
      id: `paydunya:${token}:${status}`,
      type: `invoice.${status.toLowerCase()}`,
      payload: { ...payload, transaction: { id: token } },
    };
  }
}
