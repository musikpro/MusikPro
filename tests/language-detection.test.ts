import { describe, expect, it } from "vitest";
import { languageCodeForCountry, resolveCountryLanguage, resolveLanguageForCountry } from "@/lib/languages/country-language";
import { extractVercelCountryHeader } from "@/lib/languages/country-header";
import type { LanguageOption } from "@/lib/languages/catalog";

describe("country language detection", () => {
  it.each([
    ["CI", "fr"],
    ["SN", "fr"],
    ["US", "en"],
    ["GB", "en"],
    ["ES", "es"],
    ["MX", "es"],
    ["BR", "pt"],
    ["AO", "pt"],
  ])("maps %s to %s", (country, expected) => {
    expect(languageCodeForCountry(country)).toBe(expected);
  });
});

describe("resolveCountryLanguage", () => {
  it("uses an admin override language when present, even if it contradicts the static mapping", () => {
    expect(resolveCountryLanguage("US", { US: "fr" })).toBe("fr");
  });

  it("falls back to the static mapping when no override exists for the country", () => {
    expect(resolveCountryLanguage("US", {})).toBe("en");
  });

  it("is case-insensitive on the country code when matching overrides", () => {
    expect(resolveCountryLanguage("us", { US: "pt" })).toBe("pt");
  });
});

describe("extractVercelCountryHeader", () => {
  it("returns the uppercased country code from x-vercel-ip-country", () => {
    expect(extractVercelCountryHeader(new Headers({ "x-vercel-ip-country": "ci" }))).toBe("CI");
  });

  it("returns null when the header is absent", () => {
    expect(extractVercelCountryHeader(new Headers())).toBeNull();
  });

  it("returns null for Vercel's unknown-country placeholder", () => {
    expect(extractVercelCountryHeader(new Headers({ "x-vercel-ip-country": "XX" }))).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(extractVercelCountryHeader(new Headers({ "x-vercel-ip-country": "FRA" }))).toBeNull();
  });
});

describe("resolveLanguageForCountry", () => {
  const activeLanguages: LanguageOption[] = [
    { id: "language-fr", code: "fr", name: "Français", nativeName: "Français", flag: "🇫🇷" },
    { id: "language-en", code: "en", name: "Anglais", nativeName: "English", flag: "🇬🇧" },
  ];
  const fallback = activeLanguages[0];

  it("returns the fallback when no country was detected", () => {
    expect(resolveLanguageForCountry(null, {}, activeLanguages, fallback)).toBe(fallback);
  });

  it("resolves the language matching the detected country", () => {
    expect(resolveLanguageForCountry("US", {}, activeLanguages, fallback)).toBe(activeLanguages[1]);
  });

  it("falls back when the resolved language isn't among the active languages", () => {
    expect(resolveLanguageForCountry("BR", {}, activeLanguages, fallback)).toBe(fallback);
  });

  it("honors an admin override even when the resulting language isn't among the active languages", () => {
    expect(resolveLanguageForCountry("US", { US: "pt" }, activeLanguages, fallback)).toBe(fallback);
  });
});
