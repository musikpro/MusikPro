import { describe, expect, it } from "vitest";
import { containsSparkleGlyph, stripSparkleGlyphs } from "@/lib/occasion-fields/forbidden-glyphs";
import { sanitizeFieldProposals } from "@/lib/occasion-fields/ai-schema";
import { occasionFieldFormSchema } from "@/lib/occasion-fields/form-schema";

const base = {
  occasionId: "o1",
  label: "Type de fête",
  helpText: "",
  icon: "🎉",
  placeholder: "",
  type: "select",
  optionsText: "💍 Mariage\n🎊 Soirée",
  display: "tiles",
  required: "false",
  active: "true",
  sortOrder: "10",
};

describe("pictogrammes étincelles interdits", () => {
  it("détecte et retire ✨ 🌟 💫 sans toucher aux autres emojis", () => {
    expect(containsSparkleGlyph("✨")).toBe(true);
    expect(containsSparkleGlyph("🌟")).toBe(true);
    expect(containsSparkleGlyph("🎉")).toBe(false);
    expect(containsSparkleGlyph("⭐")).toBe(false);
    expect(stripSparkleGlyphs("✨")).toBe("");
    expect(stripSparkleGlyphs("🎉")).toBe("🎉");
  });

  it("le formulaire refuse une icône ou un choix avec ✨", () => {
    expect(occasionFieldFormSchema.safeParse(base).success).toBe(true);
    expect(occasionFieldFormSchema.safeParse({ ...base, icon: "✨" }).success).toBe(false);
    expect(occasionFieldFormSchema.safeParse({ ...base, optionsText: "💍 Mariage\n✨ Autre" }).success).toBe(false);
  });

  it("une proposition de l'IA avec ✨ est nettoyée au lieu d'être rejetée", () => {
    const raw = JSON.stringify([
      { label: "Points forts", type: "long_text", icon: "✨" },
      {
        label: "Type",
        type: "select",
        icon: "🎉",
        options: [
          { label: "Mariage", emoji: "💍" },
          { label: "Autre", emoji: "✨" },
        ],
      },
    ]);
    const result = sanitizeFieldProposals(raw, { occasionId: "o1", existingLabels: [], room: 6 });
    expect(result).toHaveLength(2);
    expect(result[0].icon).toBe("");
    expect(result[1].options.map((option) => option.emoji)).toEqual(["💍", ""]);
    expect(JSON.stringify(result)).not.toMatch(/[✨🌟💫]/u);
  });
});
