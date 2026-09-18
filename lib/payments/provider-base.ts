import type { CheckoutInput, CheckoutResult, PaymentProvider, PaymentProviderId } from "./types";

export class PaymentProviderHttpError extends Error {
  constructor(public readonly status: number, public readonly code?: string) {
    super(`Payment provider HTTP ${status}${code ? ` (${code})` : ""}`);
    this.name = "PaymentProviderHttpError";
  }
}

/**
 * Automatic fallback is safe only when we know the provider rejected the request
 * before a usable checkout could have been created. Network timeouts, 5xx errors,
 * and incomplete responses are ambiguous and MUST NOT silently fall through to a
 * second provider because the first provider may already have created a payment.
 */
export function isSafeProviderFallbackError(error: unknown) {
  if (error instanceof PaymentProviderHttpError) {
    return [400, 401, 403, 404, 422, 429].includes(error.status);
  }
  const message = error instanceof Error ? error.message : "";
  return /^(Missing required environment variable:|.*requires customer |.*requires a product mapping|.*checkout requires |.*currently accepts XOF only|.*configured for XOF|.*must use HTTPS in production|Invalid .*?(id|token|number)|No enabled payment provider)/i.test(message);
}

export abstract class HttpPaymentProvider implements PaymentProvider {
  abstract id: PaymentProviderId;
  abstract createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  abstract verifyPayment(externalId: string): Promise<CheckoutResult>;
  abstract verifyWebhook(request: Request): Promise<boolean>;
  abstract parseWebhook(request: Request): Promise<{ id: string; type: string; payload: unknown }>;

  protected async json(url: string, init: RequestInit = {}) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const code = typeof body.code === "string" ? body.code
        : typeof (body.error as { code?: unknown } | undefined)?.code === "string" ? String((body.error as { code?: string }).code)
        : undefined;
      throw new PaymentProviderHttpError(response.status, code);
    }
    return body;
  }
}
