import { describe, expect, it } from "vitest";
import { languageCodeForCountry } from "@/lib/languages/country-language";

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
