import type { CheckoutInput, CheckoutResult, PaymentProvider, PaymentProviderId } from "./types";

export class PaymentProviderHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    /** Résumé court et nettoyé de la réponse du prestataire : journaux serveur uniquement, jamais renvoyé au navigateur. */
    public readonly detail?: string,
  ) {
    super(`Payment provider HTTP ${status}${code ? ` (${code})` : ""}${detail ? `: ${detail}` : ""}`);
    this.name = "PaymentProviderHttpError";
  }
}

/**
 * Extrait de la réponse d'erreur d'un prestataire le message utile au diagnostic (« phone invalide », « produit
 * introuvable »…), sans e-mail, sans suite de chiffres (numéro de téléphone, carte) et borné en taille.
 */
export function summarizeProviderError(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const parts: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
  };
  push(record.message);
  const error = record.error;
  if (typeof error === "string") push(error);
  else if (error && typeof error === "object") push((error as { message?: unknown }).message);
  const errors = record.errors;
  if (errors && typeof errors === "object") {
    for (const [field, value] of Object.entries(errors as Record<string, unknown>).slice(0, 5)) {
      const text = Array.isArray(value) ? value.filter((v) => typeof v === "string").join(" ") : value;
      if (typeof text === "string" && text.trim()) parts.push(`${field}: ${text.trim()}`);
    }
  }
  const summary = parts
    .join(" | ")
    .replace(/\S+@\S+/g, "[email]")
    .replace(/\d[\d\s.-]{5,}\d/g, "[nombre]")
    .replace(/[\u0000-\u001f]+/g, " ")
    .slice(0, 200);
  return summary || undefined;
}

/** Vrai quand le refus du prestataire porte sur le numéro de téléphone saisi (message à afficher à l'utilisateur). */
export function isPhoneRejection(error: unknown): boolean {
  return (
    error instanceof PaymentProviderHttpError &&
    [400, 422].includes(error.status) &&
    /phone|t[ée]l[ée]phone|num[ée]ro/i.test(error.detail ?? "")
  );
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
  return /^(Missing required environment variable:|.*requires customer |.*requires a product mapping|.*checkout requires |.*currently accepts XOF only|.*configured for XOF|.*must use HTTPS in production|Invalid .*?(id|token|number)|No enabled payment provider)/i.test(
    message,
  );
}

export abstract class HttpPaymentProvider implements PaymentProvider {
  abstract id: PaymentProviderId;
  abstract createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  abstract verifyPayment(externalId: string): Promise<CheckoutResult>;
  abstract verifyWebhook(request: Request): Promise<boolean>;
  abstract parseWebhook(request: Request): Promise<{ id: string; type: string; payload: unknown }>;

  protected async json(url: string, init: RequestInit = {}) {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const code =
        typeof body.code === "string"
          ? body.code
          : typeof (body.error as { code?: unknown } | undefined)?.code === "string"
            ? String((body.error as { code?: string }).code)
            : undefined;
      throw new PaymentProviderHttpError(response.status, code, summarizeProviderError(body));
    }
    return body;
  }
}
