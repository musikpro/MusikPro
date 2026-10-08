/** Drapeau (emoji) d'un code pays ISO à deux lettres (« CI » → 🇨🇮), ou « » si le code n'est pas valide. */
export function flagFromCountryCode(country: string | null | undefined): string {
  const code = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/** Pays émetteur de référence de chaque monnaie, pour le drapeau affiché dans le sélecteur de monnaie. */
const CURRENCY_COUNTRY: Record<string, string> = {
  XOF: "SN",
  XAF: "CM",
  EUR: "FR",
  USD: "US",
  NGN: "NG",
  GHS: "GH",
  KES: "KE",
  CDF: "CD",
  RWF: "RW",
  TZS: "TZ",
  UGX: "UG",
  ZMW: "ZM",
  MZN: "MZ",
  GNF: "GN",
  MAD: "MA",
  GBP: "GB",
  CAD: "CA",
  CHF: "CH",
  ZAR: "ZA",
  EGP: "EG",
  DZD: "DZ",
  TND: "TN",
  ETB: "ET",
  MGA: "MG",
  MUR: "MU",
};

/**
 * Drapeau d'une monnaie. Les monnaies partagées par plusieurs pays (franc CFA) prennent le drapeau du pays détecté du
 * visiteur quand c'est lui qui est à l'origine du choix automatique ; sinon le pays émetteur de référence. 🌍 par défaut.
 */
export function currencyFlag(code: string, detectedCountry?: string | null, isDetectedCurrency = false): string {
  if (isDetectedCurrency) {
    const detected = flagFromCountryCode(detectedCountry);
    if (detected) return detected;
  }
  return flagFromCountryCode(CURRENCY_COUNTRY[code]) || "🌍";
}

/** Nom lisible d'une monnaie sans le code entre parenthèses (« Franc CFA (XOF) » → « Franc CFA »). */
export function currencyName(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim() || label;
}
