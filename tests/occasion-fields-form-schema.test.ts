import { describe, expect, it } from "vitest";
import {
  formatOptionsText,
  occasionFieldFormSchema,
  parseOptionsText,
  slugifyFieldKey,
} from "@/lib/occasion-fields/form-schema";

const base = {
  occasionId: "occ-1",
  label: "Jour de naissance",
  type: "number",
  required: "false",
  active: "true",
  sortOrder: "10",
};

describe("parseOptionsText / formatOptionsText", () => {
  it("parses one option per line with an optional leading emoji", () => {
    expect(parseOptionsText("❄️ Janvier\n💝 Février\n\nMars")).toEqual([
      { emoji: "❄️", label: "Janvier" },
      { emoji: "💝", label: "Février" },
      { emoji: "", label: "Mars" },
    ]);
  });

  it("round-trips, including ZWJ emoji", () => {
    const options = parseOptionsText("👨‍👩‍👧‍👦 Réunion de famille\n🎊 Soirée");
    expect(options[0]).toEqual({ emoji: "👨‍👩‍👧‍👦", label: "Réunion de famille" });
    expect(parseOptionsText(formatOptionsText(options))).toEqual(options);
  });
});

describe("slugifyFieldKey", () => {
  it("builds a snake_case key without accents", () => {
    expect(slugifyFieldKey("Jour de naissance")).toBe("jour_de_naissance");
    expect(slugifyFieldKey("Âge fêté !")).toBe("age_fete");
    expect(slugifyFieldKey("???")).toBe("champ");
  });
});

describe("occasionFieldFormSchema", () => {
  it("builds a number field with min/max config and defaults", () => {
    const row = occasionFieldFormSchema.parse({ ...base, min: "1", max: "31", placeholder: "Ex: 15", icon: "📅" });
    expect(row).toMatchObject({
      type: "number",
      config: { min: 1, max: 31 },
      options: [],
      required: "false",
      icon: "📅",
      helpText: "",
      aiHint: "",
    });
  });

  it("requires 2 to 12 options for a select and defaults to tiles", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "Seul choix" })).toThrow();
    const row = occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "A\nB" });
    expect(row.config).toEqual({ display: "tiles" });
    expect(row.options).toHaveLength(2);
    const tooMany = Array.from({ length: 13 }, (_, i) => `Option ${i}`).join("\n");
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: tooMany })).toThrow();
  });

  it("rejects duplicate option labels and min > max", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "A\nA" })).toThrow();
    expect(() => occasionFieldFormSchema.parse({ ...base, min: "10", max: "1" })).toThrow();
  });

  it("caps text length config (short 200, long 600) and defaults it", () => {
    expect(occasionFieldFormSchema.parse({ ...base, type: "short_text" }).config).toEqual({ maxLength: 100 });
    expect(occasionFieldFormSchema.parse({ ...base, type: "long_text" }).config).toEqual({ maxLength: 300 });
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "short_text", maxLength: "201" })).toThrow();
  });

  it("rejects a non-emoji icon and an over-long AI hint", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, icon: "abc" })).toThrow();
    expect(() => occasionFieldFormSchema.parse({ ...base, aiHint: "x".repeat(201) })).toThrow();
  });
});
