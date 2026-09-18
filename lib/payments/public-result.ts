import type { CheckoutResult } from "./types";

/**
 * Provider adapters intentionally keep `raw` for server-side verification/debugging.
 * Never send it to browsers: gateway responses can contain internal metadata or PII.
 */
export function publicCheckoutResult(result: CheckoutResult) {
  return {
    provider: result.provider,
    externalId: result.externalId,
    status: result.status,
    checkoutUrl: result.checkoutUrl,
    money: result.money,
  };
}
