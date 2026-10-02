import { describe, expect, it } from "vitest";
import {
  applyCatalogTranslations,
  catalogStringsNeeded,
  missingUiTexts,
  sourceHash,
  type CatalogRowInput,
} from "@/lib/i18n/incremental";

describe("sourceHash", () => {
  it("is stable, trims, and differs for different texts", () => {
    expect(sourceHash("Bonjour")).toBe(sourceHash("  Bonjour "));
    expect(sourceHash("Bonjour")).not.toBe(sourceHash("Bonsoir"));
    expect(sourceHash("Bonjour")).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("missingUiTexts", () => {
  it("keeps only texts absent from both the JSON dictionary and the stored table", () => {
    const manifest = ["A", "B", "C", "constructor"];
    expect(missingUiTexts(manifest, { A: "a" }, new Set(["B"]))).toEqual(["C", "constructor"]);
  });

  it("is empty when everything is translated", () => {
    expect(missingUiTexts(["A"], { A: "a" }, new Set())).toEqual([]);
  });
});

const row = (over: Partial<CatalogRowInput> = {}): CatalogRowInput => ({
  id: "r1",
  fields: { name: "Anniversaire", description: "Fêter une année de plus" },
  translations: null,
  ...over,
});

describe("catalogStringsNeeded", () => {
  it("needs every non-empty field when nothing is translated", () => {
    expect(catalogStringsNeeded(row({ fields: { name: "A", description: "" } }), "en")).toEqual({
      needed: ["A"],
      upToDate: 0,
    });
  });

  it("skips a field whose translation exists and whose source hash matches", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    expect(catalogStringsNeeded(row({ translations }), "en")).toEqual({ needed: [], upToDate: 2 });
    // another locale is untouched by the en hashes
    expect(catalogStringsNeeded(row({ translations }), "es").needed).toHaveLength(2);
  });

  it("needs only the field whose French source changed", () => {
    const translations = {
      en: { name: "Birthday", description: "Old description" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne description") } },
    };
    expect(catalogStringsNeeded(row({ translations }), "en")).toEqual({
      needed: ["Fêter une année de plus"],
      upToDate: 1,
    });
  });

  it("treats a legacy row (translation but no _src) as needing translation once", () => {
    const translations = { en: { name: "Birthday", description: "Celebrate" } };
    expect(catalogStringsNeeded(row({ translations }), "en").needed).toHaveLength(2);
  });
});

describe("applyCatalogTranslations", () => {
  it("writes new translations with their hashes and counts them", () => {
    const result = applyCatalogTranslations(row(), "en", {
      Anniversaire: "Birthday",
      "Fêter une année de plus": "Celebrate another year",
    });
    expect(result.changed).toBe(true);
    expect(result.translatedFields).toBe(2);
    expect(result.translations).toEqual({
      en: { name: "Birthday", description: "Celebrate another year" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    });
  });

  it("is a no-op when everything is already up to date", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    const result = applyCatalogTranslations(row({ translations }), "en", {});
    expect(result).toEqual({ translations, changed: false, translatedFields: 0 });
  });

  it("keeps a legacy translation visible until the new one arrives (no _src yet)", () => {
    const translations = { en: { name: "Birthday", description: "Celebrate" } };
    const result = applyCatalogTranslations(row({ translations }), "en", { Anniversaire: "Birthday party" });
    expect(result.translations?.en).toEqual({ name: "Birthday party", description: "Celebrate" });
    expect(result.translations?._src?.en).toEqual({ name: sourceHash("Anniversaire") });
  });

  it("drops a stale translation when the French source changed and no new one arrived", () => {
    const translations = {
      en: { name: "Birthday", description: "Old description" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne description") } },
    };
    const result = applyCatalogTranslations(row({ translations }), "en", {});
    expect(result.translations?.en).toEqual({ name: "Birthday" });
    expect(result.changed).toBe(true);
  });

  it("removes translations of fields that are now empty or gone, and keeps other locales", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate", option3: "Gone" },
      es: { name: "Cumpleaños" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    const result = applyCatalogTranslations(
      row({ fields: { name: "Anniversaire", description: "" }, translations }),
      "en",
      {},
    );
    expect(result.translations?.en).toEqual({ name: "Birthday" });
    expect(result.translations?.es).toEqual({ name: "Cumpleaños" });
    expect(result.changed).toBe(true);
  });

  it("never takes an inherited property such as constructor for a received translation", () => {
    const result = applyCatalogTranslations(row({ fields: { name: "constructor" }, translations: null }), "en", {});
    expect(result.translatedFields).toBe(0);
    expect(typeof result.translations?.en?.name).not.toBe("function");
    expect(result.translations?.en?.name).toBeUndefined();
  });
});
