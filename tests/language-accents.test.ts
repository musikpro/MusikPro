import { describe, expect, it } from "vitest";
import { ACCENT_HINT_MAX_LENGTH, buildStylePrompt, buildVocalHint } from "@/lib/ai/style-prompt-builder";
import { languageAccentSchema } from "@/lib/validation/language-accents";

const IVORIAN =
  "natural Ivorian French accent, Abidjan urban vocal style, authentic Côte d’Ivoire pronunciation. Avoid European French accent.";

describe("buildVocalHint — accent de la langue chantée", () => {
  it("garde le comportement historique sans accent", () => {
    expect(buildVocalHint("Français", "Femme")).toBe("female lead vocals, sung in French");
    expect(buildVocalHint("Anglais", "Homme", "  ")).toBe("male lead vocals, sung in English");
  });

  it("ajoute l'accent en anglais à la langue chantée", () => {
    expect(buildVocalHint("Français", "Homme", IVORIAN)).toBe(`male lead vocals, sung in French with ${IVORIAN}`);
  });

  it("n'ajoute pas d'accent à une langue inconnue", () => {
    expect(buildVocalHint("Wolof", "Duo", IVORIAN)).toBe("male and female duet vocals");
  });

  it("garde le prompt complet sous la limite de Musicful avec un accent au maximum", () => {
    const hint = "a".repeat(ACCENT_HINT_MAX_LENGTH);
    const prompt = buildStylePrompt(
      "Zouglou",
      "x".repeat(420),
      "Énergique",
      true,
      "o".repeat(70),
      buildVocalHint("Français", "Femme", hint),
    );
    expect(prompt.length).toBeLessThanOrEqual(1000);
    expect(prompt).toContain(`Vocals: female lead vocals, sung in French with ${hint}`);
  });
});

describe("languageAccentSchema", () => {
  const valid = {
    languageCode: "fr",
    name: "Français ivoirien",
    aiHint: IVORIAN,
    active: "true",
    sortOrder: "10",
    styleIds: ["style-1"],
  };

  it("accepte une variante valide", () => {
    expect(languageAccentSchema.safeParse(valid).success).toBe(true);
  });

  it("refuse une consigne trop longue, vide ou sur plusieurs lignes", () => {
    expect(languageAccentSchema.safeParse({ ...valid, aiHint: "a".repeat(ACCENT_HINT_MAX_LENGTH + 1) }).success).toBe(
      false,
    );
    expect(languageAccentSchema.safeParse({ ...valid, aiHint: "  " }).success).toBe(false);
    expect(languageAccentSchema.safeParse({ ...valid, aiHint: "line one\nline two" }).success).toBe(false);
  });

  it("refuse un code de langue invalide et trop de styles", () => {
    expect(languageAccentSchema.safeParse({ ...valid, languageCode: "français" }).success).toBe(false);
    expect(
      languageAccentSchema.safeParse({ ...valid, styleIds: Array.from({ length: 201 }, (_, i) => `s${i}`) }).success,
    ).toBe(false);
  });
});
