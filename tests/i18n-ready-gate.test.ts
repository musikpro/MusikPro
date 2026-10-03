import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isI18nReady,
  markI18nReady,
  resetI18nReadyForTests,
  resetOverlayForTests,
  setOverlay,
  getOverlayVersion,
} from "@/lib/i18n/overlay";
import { localizeField, translate, translateTemplate } from "@/lib/i18n/translate";

function fakeDocument(lang: string) {
  (globalThis as unknown as { document: unknown }).document = { documentElement: { lang } };
}

describe("indicateur d'hydratation", () => {
  beforeEach(() => {
    resetOverlayForTests();
    resetI18nReadyForTests();
    fakeDocument("en");
  });
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("renvoie le français tant que l'hydratation n'est pas terminée, même si <html lang> est en", () => {
    setOverlay("en", { "Se connecter": "Sign in" });
    expect(translate("Se connecter")).toBe("Se connecter");
    expect(translateTemplate("Bonjour {name}", { name: "Awa" })).toBe("Bonjour Awa");
    expect(localizeField("Anniversaire", { en: { name: "Birthday" } }, "name")).toBe("Anniversaire");
  });

  it("traduit une fois l'indicateur posé", () => {
    setOverlay("en", { "Se connecter": "Sign in" });
    markI18nReady();
    expect(isI18nReady()).toBe(true);
    expect(translate("Se connecter")).toBe("Sign in");
    expect(localizeField("Anniversaire", { en: { name: "Birthday" } }, "name")).toBe("Birthday");
  });

  it("markI18nReady incrémente la version une seule fois (déclenche le re-rendu des abonnés)", () => {
    const before = getOverlayVersion();
    markI18nReady();
    markI18nReady();
    expect(getOverlayVersion()).toBe(before + 1);
  });

  it("côté serveur (sans document), reste en français", () => {
    delete (globalThis as { document?: unknown }).document;
    markI18nReady();
    expect(translate("Se connecter")).toBe("Se connecter");
  });
});
