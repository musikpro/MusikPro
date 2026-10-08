import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LegalEmail, LegalPage } from "@/components/legal-page";

const base = {
  eyebrow: "E",
  title: "T",
  introduction: "I",
  sections: [{ title: "S", content: createElement("p", null, "c") }],
  path: "/terms" as const,
};

describe("LegalPage", () => {
  it("français : aucun bandeau, date française, pas de lang forcé", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, { ...base, locale: "fr", forcedFrench: false }));
    expect(html).not.toContain("legal-notice");
    expect(html).toContain("Dernière mise à jour : 8 octobre 2026");
    expect(html).not.toContain('lang="fr"');
  });
  it("langue étrangère : bandeau avec lien ?lang=fr (textes français faute de traduction)", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, { ...base, locale: "en", forcedFrench: false }));
    expect(html).toContain("legal-notice");
    expect(html).toContain("/terms?lang=fr");
    expect(html).not.toContain('lang="fr"');
  });
  it("français forcé : pas de bandeau, lang=fr sur main", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, { ...base, locale: "fr", forcedFrench: true }));
    expect(html).not.toContain("legal-notice");
    expect(html).toContain('<main class="legal-shell" lang="fr"');
  });
});

describe("LegalEmail", () => {
  it("insère le lien à la place du marqueur", () => {
    const html = renderToStaticMarkup(createElement(LegalEmail, { text: "écrivez à {email}.", email: "a@b.c" }));
    expect(html).toBe('écrivez à <a href="mailto:a@b.c">a@b.c</a>.');
  });
  it("ajoute le lien en fin si la traduction a perdu le marqueur", () => {
    const html = renderToStaticMarkup(createElement(LegalEmail, { text: "write to us", email: "a@b.c" }));
    expect(html).toBe('write to us <a href="mailto:a@b.c">a@b.c</a>');
  });
});

describe("LegalPage : manifeste et liens", () => {
  it("les textes du cadre sont dans le manifeste i18n (donc traduits par « Actualiser les traductions »)", () => {
    const manifest = JSON.parse(readFileSync("lib/i18n/manifest.json", "utf8")) as string[] | Record<string, unknown>;
    const keys = Array.isArray(manifest) ? manifest : Object.keys(manifest);
    for (const key of [
      "Dernière mise à jour : {date}",
      "Traduction automatique : en cas de divergence, la version française fait foi.",
      "Consulter la version française",
      "Confidentialité",
      "Connexion",
    ]) {
      expect(keys).toContain(key);
    }
  });
  it("le pied de page garde la version française forcée", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, { ...base, locale: "fr", forcedFrench: true }));
    expect(html).toContain('href="/privacy?lang=fr"');
    expect(html).toContain('href="/terms?lang=fr"');
    const normal = renderToStaticMarkup(createElement(LegalPage, { ...base, locale: "fr", forcedFrench: false }));
    expect(normal).toContain('href="/privacy"');
  });
});
