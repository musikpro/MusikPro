import { describe, expect, it } from "vitest";
import { creditCurrencies, convertFromXof, formatCreditPrice } from "@/lib/credit-plans/currency";

describe("creditCurrencies", () => {
  it("includes the 8 newly supported local currencies", () => {
    const codes = creditCurrencies.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["KES", "CDF", "RWF", "TZS", "UGX", "ZMW", "MZN", "GNF"]));
  });
});

describe("convertFromXof with new currencies", () => {
  it("converts a XOF amount to CDF using the configured rate", () => {
    expect(convertFromXof(1000, "CDF")).toBeCloseTo(4500, 5);
  });

  it("falls back to XOF for an unknown currency code", () => {
    expect(convertFromXof(1000, "GNF_TYPO")).toBe(1000);
  });
});

describe("formatCreditPrice with new currencies", () => {
  it("formats CDF with no decimals, like other large-denomination currencies", () => {
    // A decimal separator followed by exactly 2 digits with no further digit after —
    // distinguishes a real fractional part from a thousands-grouping comma (e.g. "4,500").
    expect(formatCreditPrice(1000, "CDF")).not.toMatch(/[.,]\d{2}(?!\d)/);
  });

  it("formats ZMW with 2 decimals, like GHS", () => {
    const formatted = formatCreditPrice(1000, "ZMW");
    expect(formatted).toMatch(/[.,]\d{2}(?!\d)/);
  });
});
