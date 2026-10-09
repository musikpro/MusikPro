import { describe, expect, it } from "vitest";
import { currencyFlag, currencyName, flagFromCountryCode } from "@/lib/credit-plans/currency-flags";

describe("drapeaux et noms de monnaie", () => {
  it("convertit un code pays en drapeau et refuse un code invalide", () => {
    expect(flagFromCountryCode("CI")).toBe("🇨🇮");
    expect(flagFromCountryCode(" sn ")).toBe("🇸🇳");
    expect(flagFromCountryCode("")).toBe("");
    expect(flagFromCountryCode("XYZ")).toBe("");
    expect(flagFromCountryCode(null)).toBe("");
  });

  it("prend le drapeau du pays détecté pour la monnaie choisie automatiquement, sinon le pays émetteur", () => {
    expect(currencyFlag("XOF", "CI", true)).toBe("🇨🇮");
    expect(currencyFlag("XOF", "CI", false)).toBe("🇨🇮");
    expect(currencyFlag("XOF", "SN", true)).toBe("🇨🇮");
    expect(currencyFlag("USD", "CI", false)).toBe("🇺🇸");
    expect(currencyFlag("ZZZ", null)).toBe("🌍");
    expect(currencyFlag("XOF", null, true)).toBe("🇨🇮");
  });

  it("retire le code entre parenthèses du nom", () => {
    expect(currencyName("Franc CFA (XOF)")).toBe("Franc CFA");
    expect(currencyName("Euro (€)")).toBe("Euro");
    expect(currencyName("Naira")).toBe("Naira");
  });
});
