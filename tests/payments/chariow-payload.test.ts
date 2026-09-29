import { describe, expect, it } from "vitest";
import { chariowPayloadSchema, paymentSummarySchema } from "@/lib/validation/payment-providers";

// Shape of a real Chariow Pulse "successful.sale": inapplicable blocks are sent as explicit null.
const pulse = {
  event: "successful.sale",
  sale: {
    id: "SALEPUOQJEKIFSZYE8H",
    amount: { value: 578, currency: "XOF" },
    status: "completed",
    custom_metadata: { plan_id: "credits-decouverte-5", payment_id: "p1", app_reference: "ask_1" },
  },
  product: { id: "prd_b6w9sl7s" },
  customer: { id: "cus_1", email: "client@example.com" },
  affiliate: null,
  license: null,
};

describe("Chariow Pulse payload", () => {
  it("accepts explicit null blocks (no affiliate / no license)", () => {
    const parsed = chariowPayloadSchema.parse(pulse);
    expect(parsed.event).toBe("successful.sale");
    expect(parsed.sale?.id).toBe("SALEPUOQJEKIFSZYE8H");
  });

  it("keeps the normalised summary readable by the billing webhook", () => {
    const parsed = chariowPayloadSchema.parse(pulse);
    const summary = paymentSummarySchema.safeParse({ ...parsed, transaction: { id: String(parsed.sale?.id) } });
    expect(summary.success).toBe(true);
  });
});
