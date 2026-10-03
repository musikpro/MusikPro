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
  it("laisse un message inconnu (ex. message anglais par défaut de Zod) tel quel", () => {
    expect(translateIssue({ message: "Invalid input" })).toBe("Invalid input");
  });
  it("ne prend jamais une clé héritée du prototype pour une traduction", () => {
    expect(translateIssue({ message: "constructor" })).toBe("constructor");
  });
});
