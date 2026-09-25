export type FunnelStepInput = { label: string; value: number };
export type FunnelStep = FunnelStepInput & { conversionRate: number | null };

/**
 * Computes, for each step after the first, the ratio of its value against the immediately
 * preceding step — never fabricates a rate when the previous step is empty (no division by
 * zero / NaN / Infinity leaking into the UI).
 */
export function computeFunnelConversionRates(steps: FunnelStepInput[]): FunnelStep[] {
  return steps.map((step, index) => {
    if (index === 0) return { ...step, conversionRate: null };
    const previous = steps[index - 1].value;
    return { ...step, conversionRate: previous > 0 ? step.value / previous : null };
  });
}
