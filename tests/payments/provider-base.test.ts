import { describe, expect, it } from "vitest";
import {
  isPhoneRejection,
  isSafeProviderFallbackError,
  PaymentProviderHttpError,
  summarizeProviderError,
} from "@/lib/payments/provider-base";

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

describe("summarizeProviderError / isPhoneRejection", () => {
  it("keeps the useful provider message without e-mail or long digit sequences", () => {
    const summary = summarizeProviderError({
      message: "Validation failed for ana@example.com",
      errors: { phone: ["The phone number 0701020304 is invalid."] },
    });
    expect(summary).toContain("Validation failed");
    expect(summary).toContain("phone:");
    expect(summary).not.toMatch(/ana@example\.com|0701020304/);
    expect(summary!.length).toBeLessThanOrEqual(200);
  });

  it("returns nothing for an empty or unusable body", () => {
    expect(summarizeProviderError(undefined)).toBeUndefined();
    expect(summarizeProviderError({})).toBeUndefined();
    expect(summarizeProviderError("boom")).toBeUndefined();
  });

  it("puts the detail in the server-side message only and flags phone rejections", () => {
    const error = new PaymentProviderHttpError(400, undefined, "phone: invalid");
    expect(error.message).toBe("Payment provider HTTP 400: phone: invalid");
    expect(isPhoneRejection(error)).toBe(true);
    expect(isPhoneRejection(new PaymentProviderHttpError(400, undefined, "product not found"))).toBe(false);
    expect(isPhoneRejection(new PaymentProviderHttpError(500, undefined, "phone"))).toBe(false);
    expect(isPhoneRejection(new Error("phone"))).toBe(false);
  });
});
