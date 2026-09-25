import { describe, expect, it } from "vitest";
import { matchesSongSearch } from "../lib/demo/search";
import { DEFAULT_CREDIT_PLANS, getGenerationCount, getVersionCount } from "../lib/credit-plans/catalog";
import { convertFromXof, creditCurrencies, formatCreditPrice } from "../lib/credit-plans/currency";
describe("Recherche MusikPro", () => {
  it("ignore les accents et la casse", () =>
    expect(matchesSongSearch(" GLOIRE a toi ", "Gloire à Toi", "Gospel")).toBe(true));
  it("combine les mots entre titre, style et occasion", () =>
    expect(matchesSongSearch("amapiano mariage", "Mon mariage", "Amapiano", "Mariage")).toBe(true));
  it("refuse un mot absent", () =>
    expect(matchesSongSearch("afrobeat mariage", "Mon mariage", "Amapiano")).toBe(false));
  it("affiche tous les titres quand la recherche est effacée", () =>
    expect(matchesSongSearch("", "Mama Africa")).toBe(true));
  it("applique la règle de deux crédits par génération", () => {
    expect(DEFAULT_CREDIT_PLANS).toHaveLength(4);
    expect(DEFAULT_CREDIT_PLANS[0].credits).toBe(5);
    expect(getGenerationCount(DEFAULT_CREDIT_PLANS[0].credits)).toBe(2);
    expect(getVersionCount(DEFAULT_CREDIT_PLANS[0].credits)).toBe(4);
  });
  it("convertit automatiquement le prix de référence FCFA", () => {
    expect(creditCurrencies.map((currency) => currency.code)).toEqual(["XOF", "XAF", "EUR", "USD", "NGN", "GHS"]);
    expect(convertFromXof(655_957, "EUR")).toBeCloseTo(1000, 4);
    expect(formatCreditPrice(1_000, "XOF")).toContain("1 000");
    expect(formatCreditPrice(1_000, "EUR")).toContain("€");
  });
});
