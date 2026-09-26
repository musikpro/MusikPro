import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { countryLanguages, localizationSettings } from "@/db/schema";
import { cacheGet, cacheSet } from "@/lib/cache/upstash";
import { resolveCurrencyForCountry, type CreditCurrencyCode } from "@/lib/credit-plans/currency";
import { requireEnv } from "@/lib/security/env";
import type { LanguageOption } from "./catalog";
import { extractVercelCountryHeader } from "./country-header";
import { resolveLanguageForCountry } from "./country-language";

export { languageCodeForCountry, resolveCountryLanguage } from "./country-language";
export { extractVercelCountryHeader } from "./country-header";

const COUNTRY_IS_URL = "https://api.country.is";
const FALLBACK_TTL_SECONDS = 7 * 24 * 60 * 60;
const localCountryCache = new Map<string, { country: string; expiresAt: number }>();

export function visitorIpFromHeaders(headersList: Headers): string | null {
  const candidates = [
    headersList.get("x-vercel-forwarded-for"),
    headersList.get("cf-connecting-ip"),
    headersList.get("x-forwarded-for"),
    headersList.get("x-real-ip"),
  ];
  for (const candidate of candidates) {
    const value = candidate
      ?.split(",")[0]
      ?.trim()
      .replace(/^\[|\]$/g, "");
    if (value && isIP(value)) return value;
  }
  return null;
}

function cacheKey(ip: string): string {
  const digest = createHmac("sha256", requireEnv("BETTER_AUTH_SECRET")).update(ip).digest("hex");
  return `geo:country:v1:${digest}`;
}

async function lookupCountry(ip: string, ttlSeconds: number): Promise<string | null> {
  const key = cacheKey(ip);
  const cached = await cacheGet<string>(key);
  if (cached && /^[A-Z]{2}$/.test(cached)) return cached;
  const locallyCached = localCountryCache.get(key);
  if (locallyCached && locallyCached.expiresAt > Date.now()) return locallyCached.country;
  try {
    const response = await fetch(`${COUNTRY_IS_URL}/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/json", "User-Agent": "MusikPro/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { country?: unknown };
    const country = typeof body.country === "string" ? body.country.toUpperCase() : "";
    if (!/^[A-Z]{2}$/.test(country)) return null;
    await cacheSet(key, country, ttlSeconds);
    localCountryCache.set(key, { country, expiresAt: Date.now() + ttlSeconds * 1000 });
    return country;
  } catch {
    return null;
  }
}

type LocalizationSettingsSnapshot = {
  enabled: boolean;
  defaultLanguageCode: string;
  ttlSeconds: number;
  fallbackCountryCode: string | null;
};

// cache() dedupes this within a single request — detectInterfaceLanguage and detectCurrency both
// need it, and without this both `app/dashboard/layout.tsx` calls would otherwise each run their
// own `localization_settings` query and, on a country.is cache miss, their own network call.
const resolveLocalizationSettings = cache(async (): Promise<LocalizationSettingsSnapshot> => {
  try {
    const [settings] = await db
      .select()
      .from(localizationSettings)
      .where(eq(localizationSettings.id, "global"))
      .limit(1);
    return {
      enabled: settings?.automaticDetectionEnabled ?? true,
      defaultLanguageCode: settings?.defaultLanguageCode ?? "fr",
      ttlSeconds: settings?.countryCacheTtlSeconds ?? FALLBACK_TTL_SECONDS,
      fallbackCountryCode: settings?.fallbackCountryCode ?? null,
    };
  } catch {
    // Migration not yet applied: preserve a safe, usable default.
    return { enabled: true, defaultLanguageCode: "fr", ttlSeconds: FALLBACK_TTL_SECONDS, fallbackCountryCode: null };
  }
});

const resolveVisitorCountryCode = cache(
  async (headersList: Headers, ttlSeconds: number, fallbackCountryCode: string | null): Promise<string | null> => {
    // Fast path: Vercel already resolved the visitor's country for this request, at no cost — skip
    // the IP lookup, the cache round-trip and any call to country.is entirely when it's usable.
    let country = extractVercelCountryHeader(headersList);
    if (!country) {
      const ip = visitorIpFromHeaders(headersList);
      if (ip) country = await lookupCountry(ip, ttlSeconds);
    }
    return country ?? fallbackCountryCode;
  },
);

type CountryLanguageRow = { languageCode: string | undefined; currencyCode: string | undefined };

// cache() dedupes this per country within a single request, for the same reason as above.
const resolveCountryLanguageRow = cache(async (country: string): Promise<CountryLanguageRow> => {
  try {
    const [row] = await db
      .select({ languageCode: countryLanguages.languageCode, currencyCode: countryLanguages.currencyCode })
      .from(countryLanguages)
      .where(eq(countryLanguages.countryCode, country))
      .limit(1);
    return { languageCode: row?.languageCode, currencyCode: row?.currencyCode };
  } catch {
    // Migration not yet applied: no override available.
    return { languageCode: undefined, currencyCode: undefined };
  }
});

export async function detectInterfaceLanguage(
  headersList: Headers,
  activeLanguages: LanguageOption[],
): Promise<LanguageOption | null> {
  if (!activeLanguages.length) return null;
  const { enabled, defaultLanguageCode, ttlSeconds, fallbackCountryCode } = await resolveLocalizationSettings();
  const fallback = activeLanguages.find((language) => language.code === defaultLanguageCode) ?? activeLanguages[0];
  if (!enabled) return fallback;

  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return fallback;

  const { languageCode: override } = await resolveCountryLanguageRow(country);
  return resolveLanguageForCountry(country, override ? { [country]: override } : {}, activeLanguages, fallback);
}

export async function detectCurrency(headersList: Headers): Promise<CreditCurrencyCode | null> {
  const { enabled, ttlSeconds, fallbackCountryCode } = await resolveLocalizationSettings();
  if (!enabled) return null;

  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return null;

  const { currencyCode: override } = await resolveCountryLanguageRow(country);
  return resolveCurrencyForCountry(country, override ? { [country]: override } : {});
}
