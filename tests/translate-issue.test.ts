import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markI18nReady, resetI18nReadyForTests, resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";
import { translateIssue } from "@/lib/validation/translate-issue";

describe("translateIssue", () => {
  beforeEach(() => {
    resetOverlayForTests();
    resetI18nReadyForTests();
    (globalThis as unknown as { document: unknown }).document = { documentElement: { lang: "en" } };
    markI18nReady();
  });
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("traduit un message connu", () => {
    setOverlay("en", { "Indicatif téléphonique invalide.": "Invalid phone prefix." });
    expect(translateIssue({ message: "Indicatif téléphonique invalide." })).toBe("Invalid phone prefix.");
  });
  it("traduit « Maximum N caractères. » avec la valeur", () => {
    setOverlay("en", { "Maximum {max} caractères.": "Maximum {max} characters." });
    expect(translateIssue({ message: "Maximum 500 caractères." })).toBe("Maximum 500 characters.");
  });
  it("traduit « Maximum N mots. » avec la valeur", () => {
    setOverlay("en", { "Maximum {max} mots.": "Maximum {max} words." });
    expect(translateIssue({ message: "Maximum 400 mots." })).toBe("Maximum 400 words.");
  });
  it("traduit « Saisis exactement N chiffres… » avec la valeur", () => {
    setOverlay("en", { "Saisis exactement {digits} chiffres pour cet indicatif.": "Enter exactly {digits} digits for this prefix." });
    expect(translateIssue({ message: "Saisis exactement 9 chiffres pour cet indicatif." })).toBe(
      "Enter exactly 9 digits for this prefix.",
    );
  });
  it("n'applique pas les motifs à un message plus large (ancrage)", () => {
    setOverlay("en", { "Maximum {max} mots.": "Maximum {max} words." });
    expect(translateIssue({ message: "Il y a Maximum 4 mots. ici" })).toBe("Il y a Maximum 4 mots. ici");
  });
  it("laisse un message inconnu (ex. message anglais par défaut de Zod) tel quel", () => {
    expect(translateIssue({ message: "Invalid input" })).toBe("Invalid input");
  });
  it("ne prend jamais une clé héritée du prototype pour une traduction", () => {
    expect(translateIssue({ message: "constructor" })).toBe("constructor");
  });
});
