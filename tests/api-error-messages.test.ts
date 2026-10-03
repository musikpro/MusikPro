import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markI18nReady, resetI18nReadyForTests, resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";
import { API_ERROR_MESSAGES, translateApiMessage } from "@/lib/api/error-messages";

describe("translateApiMessage", () => {
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
    setOverlay("en", { "Authentification requise.": "Authentication required." });
    expect(translateApiMessage("Authentification requise.")).toBe("Authentication required.");
  });
  it("traduit « Il faut N crédits… » avec la valeur", () => {
    setOverlay("en", {
      "Il faut {credits} crédits pour lancer une génération musicale.": "You need {credits} credits to start a music generation.",
    });
    expect(translateApiMessage("Il faut 3 crédits pour lancer une génération musicale.")).toBe(
      "You need 3 credits to start a music generation.",
    );
  });
  it("traduit « chanson déjà utilisée » avec les usages", () => {
    setOverlay("en", { "Cette chanson est déjà utilisée et ne peut pas être supprimée : {usages}.": "This song is in use and cannot be deleted: {usages}." });
    expect(translateApiMessage("Cette chanson est déjà utilisée et ne peut pas être supprimée : Album A, Carte B.")).toBe(
      "This song is in use and cannot be deleted: Album A, Carte B.",
    );
  });
  it("traduit « informations personnalisées invalides » et sa cause", () => {
    setOverlay("en", {
      "Certaines informations personnalisées sont invalides ({cause}). Vérifie l’étape « Personnalise ta chanson ».":
        "Some custom details are invalid ({cause}). Check the “Personalize your song” step.",
      "Ce champ est obligatoire.": "This field is required.",
    });
    expect(
      translateApiMessage(
        "Certaines informations personnalisées sont invalides (Ce champ est obligatoire.). Vérifie l’étape « Personnalise ta chanson ».",
      ),
    ).toBe("Some custom details are invalid (This field is required.). Check the “Personalize your song” step.");
  });
  it("laisse un message inconnu ou « HTTP 500 » tel quel", () => {
    expect(translateApiMessage("HTTP 500")).toBe("HTTP 500");
    expect(translateApiMessage("Something else")).toBe("Something else");
  });
  it("ne prend pas une clé héritée du prototype pour une traduction", () => {
    expect(translateApiMessage("constructor")).toBe("constructor");
  });
  it("la liste ne contient que des chaînes uniques non vides", () => {
    expect(new Set(API_ERROR_MESSAGES).size).toBe(API_ERROR_MESSAGES.length);
    expect(API_ERROR_MESSAGES.every((message) => message.trim().length > 0)).toBe(true);
  });
});
