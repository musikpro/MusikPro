const INVALID_VERCEL_COUNTRY_CODES = new Set(["XX"]);

/**
 * Vercel sets `x-vercel-ip-country` on every production request at no cost — reading it first
 * skips the country.is API call (and the cache lookup) entirely whenever the platform already
 * knows the visitor's country. Returns null when absent/invalid so callers fall through to
 * IP-based detection (local dev, non-Vercel environments, unknown-country requests).
 */
export function extractVercelCountryHeader(headersList: Headers): string | null {
  const raw = headersList.get("x-vercel-ip-country");
  if (!raw) return null;
  const country = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country) || INVALID_VERCEL_COUNTRY_CODES.has(country)) return null;
  return country;
}
