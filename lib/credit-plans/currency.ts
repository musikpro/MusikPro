export const creditCurrencies = [
  { code: "XOF", label: "Franc CFA (XOF)", symbol: "FCFA" },
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "Dollar ($)", symbol: "$" },
  { code: "NGN", label: "Naira (₦)", symbol: "₦" },
  { code: "GHS", label: "Cedi (GH₵)", symbol: "GH₵" },
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
};

export function convertFromXof(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  return valueInXof * unitsPerXof[code];
}

export function formatCreditPrice(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  const value = convertFromXof(valueInXof, code);
  return new Intl.NumberFormat(code === "XOF" || code === "XAF" ? "fr-FR" : "en", {
    style: "currency",
    currency: code,
    minimumFractionDigits: code === "XOF" || code === "XAF" || code === "NGN" ? 0 : 2,
    maximumFractionDigits: code === "XOF" || code === "XAF" || code === "NGN" ? 0 : 2,
  }).format(value);
}
