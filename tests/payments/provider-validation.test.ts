import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FedapayProvider } from "../../lib/payments/providers/fedapay";
import { MonerooProvider } from "../../lib/payments/providers/moneroo";
import { PaydunyaProvider } from "../../lib/payments/providers/paydunya";
import { paymentSummarySchema } from "../../lib/validation/payment-providers";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Payment provider dependency and validation regressions", () => {
  const secret = "wh_test_only_local_signature_secret";
  const payload =
    '{"id":"evt_test","name":"transaction.approved","entity":{"id":42}}';
  const request = (
    body: string,
    timestamp = Math.floor(Date.now() / 1000),
    signedBody = body,
  ) => {
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${signedBody}`)
      .digest("hex");
    return new Request("https://example.test/webhook", {
      method: "POST",
      body,
      headers: { "x-fedapay-signature": `t=${timestamp},s=${signature}` },
    });
  };
  it("keeps FedaPay SDK signature verification operational with patched dependencies", async () => {
    vi.stubEnv("FEDAPAY_WEBHOOK_SECRET", secret);
    const provider = new FedapayProvider();
    expect(await provider.verifyWebhook(request(payload))).toBe(true);
    expect(await provider.parseWebhook(request(payload))).toMatchObject({
      id: "evt_test",
      type: "transaction.approved",
    });
  });
  it("rejects tampered and expired FedaPay signatures", async () => {
    vi.stubEnv("FEDAPAY_WEBHOOK_SECRET", secret);
    const provider = new FedapayProvider();
    expect(
      await provider.verifyWebhook(
        request(payload.replace("42", "43"), undefined, payload),
      ),
    ).toBe(false);
    expect(
      await provider.verifyWebhook(
        request(payload, Math.floor(Date.now() / 1000) - 600),
      ),
    ).toBe(false);
  });
  it("preserves the verified Moneroo amount, currency and provider metadata", async () => {
    vi.stubEnv("MONEROO_API_KEY", "test-only-api-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            data: {
              id: "p_1",
              amount: "2000",
              currency: { code: "XOF" },
              status: "completed",
              metadata: { app_reference: "local_1" },
            },
          }),
        ),
    );
    const result = await new MonerooProvider().verifyPayment("p_1");
    expect(result).toMatchObject({
      status: "paid",
      money: { amount: 2000, currency: "XOF" },
    });
    expect(
      paymentSummarySchema.parse(result.raw).data?.metadata?.app_reference,
    ).toBe("local_1");
  });
  it("rejects a malformed remote amount instead of treating it as payment success", async () => {
    vi.stubEnv("MONEROO_API_KEY", "test-only-api-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            data: {
              amount: { forged: true },
              currency: "XOF",
              status: "completed",
            },
          }),
        ),
    );
    await expect(new MonerooProvider().verifyPayment("p_1")).rejects.toThrow();
  });
  it("keeps PayDunya form IPN parsing operational", async () => {
    const body = new URLSearchParams({
      data: JSON.stringify({
        invoice: { token: "invoice_test" },
        status: "completed",
      }),
    });
    const event = await new PaydunyaProvider().parseWebhook(
      new Request("https://example.test/webhook", { method: "POST", body }),
    );
    expect(event).toMatchObject({
      id: "paydunya:invoice_test:completed",
      payload: { transaction: { id: "invoice_test" } },
    });
  });
  it("rejects invalid payment reference shapes and retains supported timestamps", () => {
    expect(
      paymentSummarySchema.safeParse({
        metadata: { app_reference: { forged: true } },
      }).success,
    ).toBe(false);
    expect(
      paymentSummarySchema.parse({
        data: { paid_at: 1710000000, metadata: { app_reference: "ref_1" } },
      }).data?.paid_at,
    ).toBe(1710000000);
  });
});
