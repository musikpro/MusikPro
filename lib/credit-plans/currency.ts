export const creditCurrencies = [
  { code: "XOF", label: "Franc CFA (XOF)", symbol: "FCFA" },
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "Dollar ($)", symbol: "$" },
  { code: "NGN", label: "Naira (₦)", symbol: "₦" },
  { code: "GHS", label: "Cedi (GH₵)", symbol: "GH₵" },
  { code: "KES", label: "Shilling kényan (KES)", symbol: "KSh" },
  { code: "CDF", label: "Franc congolais (CDF)", symbol: "FC" },
  { code: "RWF", label: "Franc rwandais (RWF)", symbol: "FRw" },
  { code: "TZS", label: "Shilling tanzanien (TZS)", symbol: "TSh" },
  { code: "UGX", label: "Shilling ougandais (UGX)", symbol: "USh" },
  { code: "ZMW", label: "Kwacha zambien (ZMW)", symbol: "ZK" },
  { code: "MZN", label: "Metical mozambicain (MZN)", symbol: "MT" },
  { code: "GNF", label: "Franc guinéen (GNF)", symbol: "FG" },
] as const;

export type CreditCurrencyCode = (typeof creditCurrencies)[number]["code"];

// XOF is the source of truth. These display rates can later be refreshed by a server-side FX provider.
const unitsPerXof: Record<CreditCurrencyCode, number> = {
  XOF: 1,
  XAF: 1,
  EUR: 1 / 655.957,
  USD: 1 / 600,
  NGN: 2.7,
  GHS: 1 / 40,
  KES: 129 / 600,
  CDF: 4.5,
  RWF: 1300 / 600,
  TZS: 2600 / 600,
  UGX: 3700 / 600,
  ZMW: 27 / 600,
  MZN: 64 / 600,
  GNF: 14.5,
};

// Zero-decimal currencies: large nominal values where sub-units aren't used in practice.
const ZERO_DECIMAL_CURRENCIES = new Set<CreditCurrencyCode>([
  "XOF",
  "XAF",
  "NGN",
  "CDF",
  "RWF",
  "TZS",
  "UGX",
  "GNF",
  "KES",
]);

export function convertFromXof(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  return valueInXof * unitsPerXof[code];
}

export function formatCreditPrice(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  const value = convertFromXof(valueInXof, code);
  const zeroDecimals = ZERO_DECIMAL_CURRENCIES.has(code);
  return new Intl.NumberFormat(code === "XOF" || code === "XAF" ? "fr-FR" : "en", {
    style: "currency",
    currency: code,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(value);
}

/**
 * Resolves the display currency for a country, from an admin-configured override
 * (the `country_languages.currencyCode` column) only — there is no static heuristic
 * fallback for currency, unlike language.
 */
export function resolveCurrencyForCountry(
  country: string | null,
  overrides: Record<string, string>,
): CreditCurrencyCode | null {
  if (!country) return null;
  const code = overrides[country.trim().toUpperCase()];
  return creditCurrencies.some((item) => item.code === code) ? (code as CreditCurrencyCode) : null;
}
