import { afterEach, describe, expect, it } from "vitest";
import { providerEnvironmentConfigured } from "@/lib/payments/configured";

const previous = { ...process.env };
afterEach(() => {
  process.env = { ...previous };
});

describe("optional provider configuration", () => {
  it("keeps a provider inert when credentials are absent", () => {
    delete process.env.FEDAPAY_SECRET_KEY;
    delete process.env.FEDAPAY_WEBHOOK_SECRET;
    expect(providerEnvironmentConfigured("fedapay")).toBe(false);
  });

  it("activates provider routing only when required env is present", () => {
    process.env.FEDAPAY_SECRET_KEY = "test-secret";
    process.env.FEDAPAY_WEBHOOK_SECRET = "test-webhook";
    expect(providerEnvironmentConfigured("fedapay")).toBe(true);
  });
});
