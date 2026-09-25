import { describe, expect, it } from "vitest";
import { isSafeProviderFallbackError, PaymentProviderHttpError } from "@/lib/payments/provider-base";

describe("payment provider fallback safety", () => {
  it("allows explicit client/configuration rejections", () => {
    expect(isSafeProviderFallbackError(new PaymentProviderHttpError(422))).toBe(true);
    expect(isSafeProviderFallbackError(new Error("Missing required environment variable: FEDAPAY_SECRET_KEY"))).toBe(
      true,
    );
  });

  it("blocks ambiguous network/server failures", () => {
    expect(isSafeProviderFallbackError(new PaymentProviderHttpError(500))).toBe(false);
    expect(isSafeProviderFallbackError(new Error("fetch failed"))).toBe(false);
  });
});
