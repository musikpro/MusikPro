import { describe, expect, it } from "vitest";
import { languageCodeForCountry, resolveCountryLanguage } from "@/lib/languages/country-language";

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
