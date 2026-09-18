import { afterEach, describe, expect, it } from "vitest";
import { providerCapabilities, providerRuntimeAllowed } from "@/lib/payments/capabilities";

const previous = { ...process.env };
afterEach(() => {
  process.env = { ...previous };
});

describe("provider maturity guard", () => {
  it("never allows scaffold or merchant-validation providers", () => {
    expect(providerRuntimeAllowed("stripe")).toBe(false);
    expect(providerRuntimeAllowed("djomy")).toBe(false);
  });

  it("keeps beta providers sandbox-only", () => {
    process.env.FLUTTERWAVE_ENVIRONMENT = "live";
    expect(providerCapabilities.flutterwave.readiness).toBe("beta");
    expect(providerRuntimeAllowed("flutterwave")).toBe(false);
    process.env.FLUTTERWAVE_ENVIRONMENT = "sandbox";
    expect(providerRuntimeAllowed("flutterwave")).toBe(true);
  });
});
