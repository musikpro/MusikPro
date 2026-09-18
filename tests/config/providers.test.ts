import { describe, expect, it } from "vitest";
import catalog from "@/config/providers.json";
import { providerCapabilities } from "@/lib/payments/capabilities";

describe("provider catalog", () => {
  it("has a capability entry for every configured provider", () => {
    for (const id of Object.keys(catalog)) {
      expect(providerCapabilities[id as keyof typeof providerCapabilities]).toBeTruthy();
    }
  });

  it("does not mark unsupported providers as production", () => {
    expect(providerCapabilities.djomy.readiness).not.toBe("production");
    expect(providerCapabilities.stripe.readiness).not.toBe("production");
  });
});
