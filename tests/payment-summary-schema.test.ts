import { describe, expect, it } from "vitest";
import { paymentSummarySchema } from "@/lib/validation/payment-providers";

describe("paymentSummarySchema — formes Chariow", () => {
  it("accepte un status en objet { value, label }", () => {
    const parsed = paymentSummarySchema.safeParse({
      data: { id: "s1", status: { value: "completed", label: "Terminé" } },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepte les blocs et champs à null envoyés par Chariow", () => {
    const parsed = paymentSummarySchema.safeParse({
      data: { id: "s1", status: "completed", custom_metadata: null, created_at: null, reference: null },
      transaction: null,
      sale: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("garde le comportement existant pour un status texte et la référence applicative", () => {
    const parsed = paymentSummarySchema.safeParse({
      data: { id: "s1", status: "completed", custom_metadata: { app_reference: "ref-1" } },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.data?.custom_metadata?.app_reference).toBe("ref-1");
  });

  it("refuse toujours une charge utile de mauvais type", () => {
    expect(paymentSummarySchema.safeParse({ data: { id: { nested: true } } }).success).toBe(false);
    expect(paymentSummarySchema.safeParse({ data: { custom_metadata: "x" } }).success).toBe(false);
  });
});
