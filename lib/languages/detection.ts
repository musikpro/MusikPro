import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
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

async function resolveVisitorCountryCode(
  headersList: Headers,
  ttlSeconds: number,
  fallbackCountryCode: string | null,
): Promise<string | null> {
  // Fast path: Vercel already resolved the visitor's country for this request, at no cost — skip
  // the IP lookup, the cache round-trip and any call to country.is entirely when it's usable.
  let country = extractVercelCountryHeader(headersList);
  if (!country) {
    const ip = visitorIpFromHeaders(headersList);
    if (ip) country = await lookupCountry(ip, ttlSeconds);
  }
  return country ?? fallbackCountryCode;
}

export async function detectInterfaceLanguage(
  headersList: Headers,
  activeLanguages: LanguageOption[],
): Promise<LanguageOption | null> {
  if (!activeLanguages.length) return null;
  let enabled = true;
  let defaultLanguageCode = "fr";
  let ttlSeconds = FALLBACK_TTL_SECONDS;
  let fallbackCountryCode: string | null = null;
  try {
    const [settings] = await db
      .select()
      .from(localizationSettings)
      .where(eq(localizationSettings.id, "global"))
      .limit(1);
    enabled = settings?.automaticDetectionEnabled ?? true;
    defaultLanguageCode = settings?.defaultLanguageCode ?? "fr";
    ttlSeconds = settings?.countryCacheTtlSeconds ?? FALLBACK_TTL_SECONDS;
    fallbackCountryCode = settings?.fallbackCountryCode ?? null;
  } catch {
    // Migration not yet applied: preserve a safe, usable default.
  }
  const fallback = activeLanguages.find((language) => language.code === defaultLanguageCode) ?? activeLanguages[0];
  if (!enabled) return fallback;

  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return fallback;

  let override: string | undefined;
  try {
    const [row] = await db.select().from(countryLanguages).where(eq(countryLanguages.countryCode, country)).limit(1);
    override = row?.languageCode;
  } catch {
    // Migration not yet applied: fall back to the static heuristic mapping.
  }
  return resolveLanguageForCountry(country, override ? { [country]: override } : {}, activeLanguages, fallback);
}

export async function detectCurrency(headersList: Headers): Promise<CreditCurrencyCode | null> {
  let ttlSeconds = FALLBACK_TTL_SECONDS;
  let fallbackCountryCode: string | null = null;
  try {
    const [settings] = await db
      .select()
      .from(localizationSettings)
      .where(eq(localizationSettings.id, "global"))
      .limit(1);
    ttlSeconds = settings?.countryCacheTtlSeconds ?? FALLBACK_TTL_SECONDS;
    fallbackCountryCode = settings?.fallbackCountryCode ?? null;
  } catch {
    // Migration not yet applied: no detection possible, caller falls back to its own default.
  }
  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return null;
  try {
    const [row] = await db
      .select({ currencyCode: countryLanguages.currencyCode })
      .from(countryLanguages)
      .where(eq(countryLanguages.countryCode, country))
      .limit(1);
    return resolveCurrencyForCountry(country, row ? { [country]: row.currencyCode } : {});
  } catch {
    return null;
  }
}
