import { describe, expect, it } from "vitest";
import { summarizeUntranslated } from "@/lib/i18n/untranslated";

const none = { en: new Set<string>(), es: new Set<string>(), pt: new Set<string>() };

describe("summarizeUntranslated", () => {
  it("counts per locale the manifest texts absent from both the JSON and the table", () => {
    const result = summarizeUntranslated({
      manifest: ["A", "B", "C"],
      json: { en: { A: "a" }, es: { A: "a", B: "b" }, pt: {} },
      stored: { en: new Set(["B"]), es: new Set(), pt: new Set(["C"]) },
    });
    expect(result.perLocale).toEqual({ en: 1, es: 1, pt: 2 });
    expect(result.total).toBe(4);
  });

  it("is zero when everything is translated", () => {
    const result = summarizeUntranslated({
      manifest: ["A"],
      json: { en: { A: "a" }, es: { A: "a" }, pt: { A: "a" } },
      stored: none,
    });
    expect(result).toEqual({ perLocale: { en: 0, es: 0, pt: 0 }, total: 0 });
  });
});
