import { describe, expect, it } from "vitest";
import { computeFunnelConversionRates } from "@/lib/admin/funnel";

describe("computeFunnelConversionRates", () => {
  it("assigns no conversion rate to the first step", () => {
    const result = computeFunnelConversionRates([{ label: "Comptes créés", value: 100 }]);
    expect(result[0].conversionRate).toBeNull();
  });

  it("computes the ratio against the previous step's value", () => {
    const result = computeFunnelConversionRates([
      { label: "Comptes créés", value: 100 },
      { label: "Créations commencées", value: 40 },
    ]);
    expect(result[1].conversionRate).toBe(0.4);
  });

  it("returns null instead of dividing by zero when the previous step is empty", () => {
    const result = computeFunnelConversionRates([
      { label: "Comptes créés", value: 0 },
      { label: "Créations commencées", value: 0 },
    ]);
    expect(result[1].conversionRate).toBeNull();
  });

  it("chains rates across more than two steps independently", () => {
    const result = computeFunnelConversionRates([
      { label: "Comptes créés", value: 100 },
      { label: "Créations commencées", value: 40 },
      { label: "Paiements confirmés", value: 10 },
      { label: "Générations terminées", value: 8 },
    ]);
    expect(result.map((s) => s.conversionRate)).toEqual([null, 0.4, 0.25, 0.8]);
  });
});
