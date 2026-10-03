import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
    expect(html).toContain("Dernière mise à jour : 19 septembre 2026");
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
