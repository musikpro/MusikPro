import { describe, expect, it, vi } from "vitest";
import { sourceHash } from "@/lib/i18n/incremental";
import { chunkByBudget, runRefresh, type CatalogSource, type RefreshDeps } from "@/lib/i18n/refresh-core";
import type { CatalogTranslations } from "@/lib/i18n/translate";

const upper = (_locale: string, strings: string[]) =>
  Promise.resolve(Object.fromEntries(strings.map((s) => [s, `T(${s})`])));

function makeDeps(over: Partial<RefreshDeps> = {}) {
  const savedUi: Array<{ locale: string; entries: Record<string, string> }> = [];
  const savedRows: Array<{ id: string; translations: CatalogTranslations }> = [];
  const source: CatalogSource = {
    key: "occasions",
    rows: [{ id: "o1", fields: { name: "Anniversaire" }, translations: null }],
    save: async (id, translations) => {
      savedRows.push({ id, translations });
    },
  };
  const deps: RefreshDeps = {
    manifest: ["Bonjour", "Merci"],
    json: { en: { Bonjour: "Hello" }, es: {}, pt: {} },
    stored: { en: new Set(), es: new Set(), pt: new Set() },
    sources: [source],
    translateBatch: vi.fn(upper),
    saveUi: async (locale, entries) => {
      savedUi.push({ locale, entries });
    },
    maxBatches: 5,
    batchSize: 40,
    ...over,
  };
  return { deps, savedUi, savedRows };
}

describe("runRefresh", () => {
  it("translates only what is missing, for UI texts and catalog fields", async () => {
    const { deps, savedUi, savedRows } = makeDeps();
    const result = await runRefresh(deps);
    // en: only "Merci" (UI) + "Anniversaire" (catalog); es/pt: both UI texts + catalog
    expect(deps.translateBatch).toHaveBeenCalledWith("en", ["Merci", "Anniversaire"]);
    expect(deps.translateBatch).toHaveBeenCalledWith("es", ["Bonjour", "Merci", "Anniversaire"]);
    expect(savedUi.find((s) => s.locale === "en")?.entries).toEqual({ Merci: "T(Merci)" });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0].translations.en).toEqual({ name: "T(Anniversaire)" });
    expect(savedRows[0].translations._src?.en).toEqual({ name: sourceHash("Anniversaire") });
    expect(result.error).toBeNull();
    expect(result.remaining).toBe(0);
    expect(result.ui).toEqual({ translated: 1 + 2 + 2, alreadyUpToDate: 1 });
    expect(result.catalog.translated).toBe(3);
  });

  it("translates nothing on a second run fed with the first run's output", async () => {
    const first = makeDeps();
    await runRefresh(first.deps);
    const stored = { en: new Set<string>(), es: new Set<string>(), pt: new Set<string>() };
    for (const { locale, entries } of first.savedUi) for (const key of Object.keys(entries)) stored[locale as "en"].add(key);
    const second = makeDeps({
      stored,
      sources: [{ key: "occasions", rows: [{ id: "o1", fields: { name: "Anniversaire" }, translations: first.savedRows[0].translations }], save: async () => {} }],
    });
    const result = await runRefresh(second.deps);
    expect(second.deps.translateBatch).not.toHaveBeenCalled();
    expect(result.translated).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.alreadyUpToDate).toBeGreaterThan(0);
  });

  it("retranslates only the catalog field whose source changed", async () => {
    const translations: CatalogTranslations = {
      en: { name: "Birthday", description: "Old" },
      es: { name: "Cumpleaños", description: "Viejo" },
      pt: { name: "Aniversário", description: "Velho" },
      _src: Object.fromEntries(
        (["en", "es", "pt"] as const).map((l) => [l, { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne") }]),
      ),
    };
    const { deps, savedRows } = makeDeps({
      manifest: [],
      json: { en: {}, es: {}, pt: {} },
      sources: [{ key: "occasions", rows: [{ id: "o1", fields: { name: "Anniversaire", description: "Nouvelle" }, translations }], save: async (id, t) => { savedRows.push({ id, translations: t }); } }],
    });
    await runRefresh(deps);
    expect(deps.translateBatch).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(deps.translateBatch).mock.calls) expect(call[1]).toEqual(["Nouvelle"]);
    expect(savedRows[0].translations.en).toEqual({ name: "Birthday", description: "T(Nouvelle)" });
  });

  it("stops at the batch cap and reports what remains", async () => {
    const manifest = Array.from({ length: 100 }, (_, i) => `Texte ${i}`);
    const { deps, savedUi } = makeDeps({ manifest, json: { en: {}, es: {}, pt: {} }, sources: [], maxBatches: 2, batchSize: 40 });
    const result = await runRefresh(deps);
    expect(deps.translateBatch).toHaveBeenCalledTimes(2);
    expect(savedUi.reduce((n, s) => n + Object.keys(s.entries).length, 0)).toBe(80);
    expect(result.translated).toBe(80);
    expect(result.remaining).toBe(300 - 80);
  });

  it("persists what is already translated when the provider fails, and reports the error", async () => {
    const manifest = Array.from({ length: 50 }, (_, i) => `Texte ${i}`);
    const translateBatch = vi
      .fn<RefreshDeps["translateBatch"]>()
      .mockImplementationOnce(upper)
      .mockRejectedValueOnce(new Error("AI down"));
    const { deps, savedUi } = makeDeps({ manifest, json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch });
    const result = await runRefresh(deps);
    expect(savedUi).toHaveLength(1);
    expect(Object.keys(savedUi[0].entries)).toHaveLength(40);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.remaining).toBe(150 - 40);
  });

  it("counts a string the provider omitted as remaining, without writing it", async () => {
    const { deps, savedUi } = makeDeps({
      sources: [],
      translateBatch: vi.fn(async (_l, strings: string[]) => Object.fromEntries(strings.filter((s) => s !== "Merci").map((s) => [s, `T(${s})`]))),
    });
    const result = await runRefresh(deps);
    expect(savedUi.every((s) => !("Merci" in s.entries))).toBe(true);
    expect(result.remaining).toBe(3); // "Merci" for en, es, pt
  });

  it("never takes an inherited key such as constructor for a translation", async () => {
    const { deps, savedUi } = makeDeps({
      manifest: ["constructor"],
      json: { en: {}, es: {}, pt: {} },
      sources: [],
      translateBatch: vi.fn(async () => ({})),
    });
    const result = await runRefresh(deps);
    expect(savedUi).toHaveLength(0);
    expect(result.translated).toBe(0);
    expect(result.remaining).toBe(3);
  });
});

describe("runRefresh time budget", () => {
  it("stops launching batches once the budget is exceeded, still persists and reports remaining", async () => {
    let clock = 0;
    const translateBatch = vi.fn(async (locale: string, strings: string[]) => {
      clock += 200_000; // le premier lot « dure » plus que le budget
      return upper(locale, strings);
    });
    const { deps, savedUi, savedRows } = makeDeps({ translateBatch, maxMillis: 100_000, now: () => clock });
    const result = await runRefresh(deps);
    expect(translateBatch).toHaveBeenCalledTimes(1);
    expect(savedUi).toHaveLength(1);
    expect(savedUi[0].locale).toBe("en");
    expect(savedRows).toHaveLength(1);
    expect(result.error).toBeNull();
    // es et pt non traités : (Bonjour, Merci, Anniversaire) x 2
    expect(result.remaining).toBe(6);
  });
});

class ParseErr extends Error {}
const retryable = (e: unknown) => e instanceof ParseErr;

describe("runRefresh parse-error recovery", () => {
  const four = ["a", "b", "c", "d"];

  it("splits a chunk that fails to parse and recovers every string", async () => {
    const translateBatch = vi.fn(async (l: string, strings: string[]) => {
      if (strings.length > 2) throw new ParseErr("truncated");
      return upper(l, strings);
    });
    const { deps } = makeDeps({ manifest: four, json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch, isRetryableError: retryable });
    const result = await runRefresh(deps);
    expect(result.error).toBeNull();
    expect(result.remaining).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.translated).toBe(12);
  });

  it("skips a single poison string, keeps the rest and continues with the next locale", async () => {
    const translateBatch = vi.fn(async (l: string, strings: string[]) => {
      if (strings.includes("poison")) {
        if (strings.length > 1) throw new ParseErr("truncated");
        throw new ParseErr("still bad");
      }
      return upper(l, strings);
    });
    const { deps, savedUi } = makeDeps({ manifest: ["ok1", "poison", "ok2"], json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch, isRetryableError: retryable });
    const result = await runRefresh(deps);
    expect(result.error).toBeNull();
    expect(result.skipped).toBe(3);
    expect(result.remaining).toBe(3);
    expect(result.translated).toBe(6);
    expect(savedUi.map((s) => s.locale).sort()).toEqual(["en", "es", "pt"]);
    expect(savedUi.every((s) => !("poison" in s.entries) && "ok1" in s.entries && "ok2" in s.entries)).toBe(true);
  });

  it("still aborts on a non-retryable error and persists what was obtained", async () => {
    const translateBatch = vi
      .fn<RefreshDeps["translateBatch"]>()
      .mockImplementationOnce(upper)
      .mockRejectedValueOnce(new Error("network"));
    const manifest = Array.from({ length: 50 }, (_, i) => `Texte ${i}`);
    const { deps, savedUi } = makeDeps({ manifest, json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch, isRetryableError: retryable });
    const result = await runRefresh(deps);
    expect(result.error).toBeInstanceOf(Error);
    expect(savedUi).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it("stops retrying once the clock exceeds maxMillis", async () => {
    let clock = 0;
    const translateBatch = vi.fn(async () => {
      clock += 200_000;
      throw new ParseErr("truncated");
    });
    const { deps } = makeDeps({ manifest: four, json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch, isRetryableError: retryable, maxMillis: 100_000, now: () => clock });
    const result = await runRefresh(deps);
    expect(translateBatch).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.remaining).toBe(12);
  });

  it("uses the char budget to build chunks", async () => {
    const { deps } = makeDeps({ manifest: ["aaaa", "bbbb", "cccc"], json: { en: {}, es: {}, pt: {} }, sources: [], maxCharsPerBatch: 8, maxBatches: 10 });
    await runRefresh(deps);
    expect(vi.mocked(deps.translateBatch).mock.calls.filter((c) => c[0] === "en").map((c) => c[1])).toEqual([["aaaa", "bbbb"], ["cccc"]]);
  });
});

describe("chunkByBudget", () => {
  it("preserves order and respects maxItems", () => {
    expect(chunkByBudget(["a", "b", "c", "d", "e"], 2, 1000)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
  it("respects the char cap", () => {
    expect(chunkByBudget(["aaa", "bbb", "cc", "d"], 10, 5)).toEqual([["aaa"], ["bbb", "cc"], ["d"]]);
  });
  it("puts an oversize string alone", () => {
    expect(chunkByBudget(["a", "x".repeat(50), "b"], 10, 10)).toEqual([["a"], ["x".repeat(50)], ["b"]]);
  });
  it("returns no chunk for no strings", () => {
    expect(chunkByBudget([], 5, 5)).toEqual([]);
  });
});
