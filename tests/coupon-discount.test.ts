import { describe, expect, it } from "vitest";
import { computeDiscount } from "@/lib/coupons/catalog";

describe("computeDiscount", () => {
  it("computes a percentage discount", () => {
    expect(computeDiscount(5000, { type: "percent", value: 10 })).toBe(500);
  });

  it("computes a fixed discount", () => {
    expect(computeDiscount(5000, { type: "fixed", value: 1000 })).toBe(1000);
  });

  it("never brings the charged amount to zero, even with a 100% coupon", () => {
    const amount = 5000;
    const discount = computeDiscount(amount, { type: "percent", value: 100 });
    expect(amount - discount).toBeGreaterThan(0);
  });

  it("never brings the charged amount to zero, even with an oversized fixed coupon", () => {
    const amount = 500;
    const discount = computeDiscount(amount, { type: "fixed", value: 10_000 });
    expect(amount - discount).toBeGreaterThan(0);
  });

  it("clamps a corrupt/out-of-range percent value defensively", () => {
    expect(computeDiscount(1000, { type: "percent", value: 250 })).toBe(computeDiscount(1000, { type: "percent", value: 100 }));
  });

  it("returns zero for a non-positive amount", () => {
    expect(computeDiscount(0, { type: "percent", value: 50 })).toBe(0);
    expect(computeDiscount(-100, { type: "fixed", value: 50 })).toBe(0);
  });
});
