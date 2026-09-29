/**
 * Display currencies. XOF (franc CFA) is the source of truth of every price in the app; a price is
 * converted XOF -> USD first, then USD -> the currency shown. `unitsPerUsd` is "how many units of
 * this currency equal 1 USD" (USD itself is always 1, XOF's value is the CFA/dollar rate).
 * The admin manages the list in Langues et Monnaies > Monnaies (table `currencies`); the constant
 * below is only the built-in fallback used when that table is empty or not migrated yet.
 */
export type CreditCurrency = {
  code: string;
  label: string;
  symbol: string;
  unitsPerUsd: number;
  decimals: number;
  enabled: boolean;
  /** Admin catalog only: whether the exchange-rate refresh may overwrite `unitsPerUsd`. */
  autoUpdate?: boolean;
  sortOrder: number;
};

export type CreditCurrencyCode = string;

/** Price currency of the whole catalog (default display currency). */
export const BASE_CURRENCY_CODE = "XOF";
/** Pivot currency: XOF converts to USD, every other currency is derived from USD. */
export const PIVOT_CURRENCY_CODE = "USD";

const defaultCurrency = (
  code: string,
  label: string,
  symbol: string,
  unitsPerUsd: number,
  decimals: number,
  sortOrder: number,
): CreditCurrency => ({ code, label, symbol, unitsPerUsd, decimals, enabled: true, sortOrder });

export const DEFAULT_CURRENCIES: CreditCurrency[] = [
  defaultCurrency("XOF", "Franc CFA (XOF)", "FCFA", 600, 0, 10),
  defaultCurrency("XAF", "Franc CFA (XAF)", "FCFA", 600, 0, 20),
  defaultCurrency("EUR", "Euro (€)", "€", 600 / 655.957, 2, 30),
  defaultCurrency("USD", "Dollar ($)", "$", 1, 2, 40),
  defaultCurrency("NGN", "Naira (₦)", "₦", 1620, 0, 50),
  defaultCurrency("GHS", "Cedi (GH₵)", "GH₵", 15, 2, 60),
  defaultCurrency("KES", "Shilling kényan (KES)", "KSh", 129, 0, 70),
  defaultCurrency("CDF", "Franc congolais (CDF)", "FC", 2700, 0, 80),
  defaultCurrency("RWF", "Franc rwandais (RWF)", "FRw", 1300, 0, 90),
  defaultCurrency("TZS", "Shilling tanzanien (TZS)", "TSh", 2600, 0, 100),
  defaultCurrency("UGX", "Shilling ougandais (UGX)", "USh", 3700, 0, 110),
  defaultCurrency("ZMW", "Kwacha zambien (ZMW)", "ZK", 27, 2, 120),
  defaultCurrency("MZN", "Metical mozambicain (MZN)", "MT", 64, 2, 130),
  defaultCurrency("GNF", "Franc guinéen (GNF)", "FG", 8700, 0, 140),
];

/** @deprecated Built-in list; prefer the catalog loaded from the database (getCurrencyCatalog). */
export const creditCurrencies = DEFAULT_CURRENCIES;

function findCurrency(catalog: CreditCurrency[], code: string) {
  return catalog.find((item) => item.code === code);
}

/** Returns `currency` when the catalog knows it, else the base currency (XOF). */
export function resolveCurrencyCode(currency: string, catalog: CreditCurrency[] = DEFAULT_CURRENCIES) {
  return findCurrency(catalog, currency) ? currency : BASE_CURRENCY_CODE;
}

export function convertFromXof(valueInXof: number, currency: string, catalog: CreditCurrency[] = DEFAULT_CURRENCIES) {
  const target = findCurrency(catalog, currency);
  const base = findCurrency(catalog, BASE_CURRENCY_CODE) ?? findCurrency(DEFAULT_CURRENCIES, BASE_CURRENCY_CODE)!;
  if (!target || target.code === BASE_CURRENCY_CODE) return valueInXof;
  const valueInUsd = valueInXof / base.unitsPerUsd;
  return valueInUsd * target.unitsPerUsd;
}

export function formatCreditPrice(valueInXof: number, currency: string, catalog: CreditCurrency[] = DEFAULT_CURRENCIES) {
  const code = resolveCurrencyCode(currency, catalog);
  const entry = findCurrency(catalog, code) ?? findCurrency(DEFAULT_CURRENCIES, BASE_CURRENCY_CODE)!;
  const value = convertFromXof(valueInXof, code, catalog);
  const digits = Math.max(0, Math.min(entry.decimals, 6));
  try {
    return new Intl.NumberFormat(code === "XOF" || code === "XAF" ? "fr-FR" : "en", {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    // Admin-added code the runtime's Intl does not know: fall back to "amount symbol".
    return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} ${entry.symbol}`;
  }
}

/**
 * Resolves the display currency for a country, from an admin-configured override
 * (the `country_languages.currencyCode` column) only — there is no static heuristic
 * fallback for currency, unlike language. A currency the admin has hidden is ignored.
 */
export function resolveCurrencyForCountry(
  country: string | null,
  overrides: Record<string, string>,
  catalog: CreditCurrency[] = DEFAULT_CURRENCIES,
): CreditCurrencyCode | null {
  if (!country) return null;
  const code = overrides[country.trim().toUpperCase()];
  return catalog.some((item) => item.code === code && item.enabled) ? code : null;
}
