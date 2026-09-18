import { describe, expect, it } from "vitest";
import { publicCheckoutResult } from "@/lib/payments/public-result";

describe("publicCheckoutResult", () => {
  it("never exposes provider raw payloads to the browser", () => {
    const result = publicCheckoutResult({
      provider: "fedapay",
      externalId: "tx_123",
      status: "pending",
      checkoutUrl: "https://checkout.example.test/tx_123",
      money: { amount: 1000, currency: "XOF" },
      raw: { api_token: "must-never-leak", customer: { email: "private@example.test" } },
    });
    expect(result).not.toHaveProperty("raw");
    expect(JSON.stringify(result)).not.toContain("must-never-leak");
  });
});
