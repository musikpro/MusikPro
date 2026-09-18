import { describe, expect, it } from "vitest";
import { providerIsDegraded } from "@/lib/payments/health";

describe("providerIsDegraded", () => {
  it("does not trip on a tiny sample", () => {
    expect(providerIsDegraded(["provider_error", "provider_error"])).toBe(false);
  });

  it("trips after five recent attempts with less than 20% success", () => {
    expect(providerIsDegraded(["provider_error", "provider_error", "provider_error", "provider_error", "provider_error"])).toBe(true);
  });

  it("stays available at or above the success threshold", () => {
    expect(providerIsDegraded(["checkout_created", "provider_error", "provider_error", "provider_error", "provider_error"])).toBe(false);
  });
});
