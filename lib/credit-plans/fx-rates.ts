import "server-only";

import { z } from "zod";

/**
 * International exchange-rate services used by "Actualiser les taux" (Langues et Monnaies > Monnaies).
 * All three are public, keyless JSON endpoints returning rates against the US dollar (the pivot
 * currency of the app). Google publishes no official currency API, so it is deliberately not scraped.
 */
export type FxProviderId = "open-er-api" | "frankfurter" | "currency-api";

type FxProvider = {
  id: FxProviderId;
  label: string;
  description: string;
  url: string;
  parse: (json: unknown) => Record<string, number>;
};

const numberRecord = z.record(z.string(), z.number());

const providers: FxProvider[] = [
  {
    id: "open-er-api",
    label: "ExchangeRate-API (open.er-api.com)",
    description: "Plus de 160 devises dont le franc CFA, mise à jour quotidienne.",
    url: "https://open.er-api.com/v6/latest/USD",
    parse: (json) => z.object({ rates: numberRecord }).parse(json).rates,
  },
  {
    id: "currency-api",
    label: "Currency API (jsDelivr)",
    description: "Plus de 200 devises, données publiques mises à jour chaque jour.",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    parse: (json) => {
      const rates = z.object({ usd: numberRecord }).parse(json).usd;
      return Object.fromEntries(Object.entries(rates).map(([code, value]) => [code.toUpperCase(), value]));
    },
  },
  {
    id: "frankfurter",
    label: "Frankfurter (Banque centrale européenne)",
    description: "Taux officiels de la BCE ; couvre surtout les grandes devises (pas le franc CFA).",
    url: "https://api.frankfurter.dev/v1/latest?base=USD",
    parse: (json) => z.object({ rates: numberRecord }).parse(json).rates,
  },
];

export const FX_PROVIDER_OPTIONS = providers.map(({ id, label, description }) => ({ id, label, description }));

export const fxProviderIdSchema = z.enum(["auto", ...providers.map((provider) => provider.id)] as [
  "auto",
  ...FxProviderId[],
]);

const REQUEST_TIMEOUT_MS = 8_000;

async function fetchProviderRates(provider: FxProvider): Promise<Record<string, number>> {
  const response = await fetch(provider.url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rates = provider.parse(await response.json());
  return { ...rates, USD: 1 };
}

export type FxSyncResult = {
  /** code -> units per 1 USD, with the service that supplied each rate. */
  rates: Record<string, { unitsPerUsd: number; provider: string }>;
  errors: string[];
};

/**
 * Fetches rates for `codes`. The preferred service is tried first, then the others as fallback: a
 * currency missing from one service is taken from the next, so the result is the best coverage.
 */
export async function fetchUsdRates(codes: string[], preferred: FxProviderId | "auto"): Promise<FxSyncResult> {
  const ordered = [...providers].sort((left, right) => Number(right.id === preferred) - Number(left.id === preferred));
  const rates: FxSyncResult["rates"] = {};
  const errors: string[] = [];
  for (const provider of ordered) {
    if (codes.every((code) => rates[code])) break;
    try {
      const fetched = await fetchProviderRates(provider);
      for (const code of codes) {
        const value = fetched[code];
        if (!rates[code] && typeof value === "number" && Number.isFinite(value) && value > 0) {
          rates[code] = { unitsPerUsd: value, provider: provider.label };
        }
      }
    } catch (error) {
      errors.push(`${provider.label} : ${error instanceof Error ? error.message : "indisponible"}`);
    }
  }
  return { rates, errors };
}
