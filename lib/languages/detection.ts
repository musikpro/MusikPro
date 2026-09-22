import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { localizationSettings } from "@/db/schema";
import { cacheGet, cacheSet } from "@/lib/cache/upstash";
import { requireEnv } from "@/lib/security/env";
import type { LanguageOption } from "./catalog";
import { languageCodeForCountry } from "./country-language";

export { languageCodeForCountry } from "./country-language";

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

export async function detectInterfaceLanguage(
  headersList: Headers,
  activeLanguages: LanguageOption[],
): Promise<LanguageOption | null> {
  if (!activeLanguages.length) return null;
  let enabled = true;
  let defaultLanguageCode = "fr";
  let ttlSeconds = FALLBACK_TTL_SECONDS;
  try {
    const [settings] = await db
      .select()
      .from(localizationSettings)
      .where(eq(localizationSettings.id, "global"))
      .limit(1);
    enabled = settings?.automaticDetectionEnabled ?? true;
    defaultLanguageCode = settings?.defaultLanguageCode ?? "fr";
    ttlSeconds = settings?.countryCacheTtlSeconds ?? FALLBACK_TTL_SECONDS;
  } catch {
    // Migration not yet applied: preserve a safe, usable default.
  }
  const fallback = activeLanguages.find((language) => language.code === defaultLanguageCode) ?? activeLanguages[0];
  if (!enabled) return fallback;
  const ip = visitorIpFromHeaders(headersList);
  if (!ip) return fallback;
  const country = await lookupCountry(ip, ttlSeconds);
  if (!country) return fallback;
  const languageCode = languageCodeForCountry(country);
  return activeLanguages.find((language) => language.code === languageCode) ?? fallback;
}
