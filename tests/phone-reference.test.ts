import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { PHONE_REFERENCE } from "@/lib/languages/phone-reference";

describe("règles téléphoniques de référence (pré-remplissage du formulaire « Nouveau préfixe »)", () => {
  it("chaque pays de la liste de référence a une règle", () => {
    const missing = COUNTRIES_REFERENCE.filter((country) => !PHONE_REFERENCE[country.code]).map((c) => c.code);
    expect(missing).toEqual([]);
  });

  it("chaque règle respecte les contraintes de création d'un préfixe (indicatif, 6 à 12 chiffres, exemple numérique)", () => {
    for (const [code, rule] of Object.entries(PHONE_REFERENCE)) {
      expect(rule.dialCode, code).toMatch(/^\+\d{1,4}$/);
      expect(rule.digits, code).toBeGreaterThanOrEqual(6);
      expect(rule.digits, code).toBeLessThanOrEqual(12);
      expect(rule.example, code).toMatch(/^\d+$/);
      expect(rule.example.length, code).toBe(rule.digits);
    }
  });

  it("n'a aucune règle pour un pays absent de la liste de référence", () => {
    const known = new Set(COUNTRIES_REFERENCE.map((country) => country.code));
    expect(Object.keys(PHONE_REFERENCE).filter((code) => !known.has(code))).toEqual([]);
  });

  it("reste cohérente avec les préfixes déjà enregistrés par défaut en base", () => {
    const sql = readFileSync(path.resolve(__dirname, "../db/migrations/0030_flowery_scarecrow.sql"), "utf8");
    const rows = [...sql.matchAll(/\('default-[a-z]+', '([A-Z]{2})', '[^']*', '[^']*', '(\+\d+)', (\d+), '(\d+)'/g)];
    expect(rows.length).toBeGreaterThan(5);
    for (const [, code, dial, digits, example] of rows) {
      // Le Bénin est passé à 10 chiffres en 2024 : la référence suit le plan de numérotation actuel.
      if (code === "BJ") continue;
      expect(PHONE_REFERENCE[code], code).toEqual({ dialCode: dial, digits: Number(digits), example });
    }
  });
});
