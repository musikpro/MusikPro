import { describe, expect, it } from "vitest";
import { translationsStale } from "@/lib/occasion-fields/types";

const base = {
  label: "Mois",
  helpText: "Aide",
  placeholder: "Choisir",
  options: [
    { label: "Janvier", emoji: "" },
    { label: "Février", emoji: "" },
    { label: "Mars", emoji: "" },
  ],
};

describe("translationsStale", () => {
  it("false si rien ne change", () => {
    expect(translationsStale(base, structuredClone(base))).toBe(false);
  });
  it("true si label, aide ou placeholder changent", () => {
    expect(translationsStale(base, { ...base, label: "Mois de naissance" })).toBe(true);
    expect(translationsStale(base, { ...base, helpText: "" })).toBe(true);
    expect(translationsStale(base, { ...base, placeholder: "" })).toBe(true);
  });
  it("true si une option est retirée, réordonnée ou renommée", () => {
    expect(translationsStale(base, { ...base, options: base.options.slice(1) })).toBe(true);
    expect(translationsStale(base, { ...base, options: [base.options[1], base.options[0], base.options[2]] })).toBe(true);
    expect(translationsStale(base, { ...base, options: [{ label: "Jan", emoji: "" }, ...base.options.slice(1)] })).toBe(true);
  });
  it("false si seul l'emoji d'une option change (la traduction ne porte que sur le label)", () => {
    expect(translationsStale(base, { ...base, options: base.options.map((o) => ({ ...o, emoji: "📅" })) })).toBe(false);
  });
});
