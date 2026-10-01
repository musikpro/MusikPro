import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMoodText, buildStylePrompt, MUSICFUL_STYLE_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";
import { DEFAULT_MOODS, MOOD_AI_HINT_MAX_LENGTH, isMoodEmoji } from "@/lib/moods/catalog";
import { moodFormSchema, reorderMoodsSchema, slugifyMood, toggleMoodSchema } from "@/lib/validation/moods";

const base = { name: "Nostalgique", description: "", emoji: "🌅", aiHint: "", active: "true", sortOrder: "100" };

describe("moodFormSchema", () => {
  it("accepte une ambiance valide et convertit l'ordre en nombre", () => {
    const parsed = moodFormSchema.parse(base);
    expect(parsed.sortOrder).toBe(100);
    expect(parsed.name).toBe("Nostalgique");
  });

  it("accepte une description et une consigne IA vides (facultatives)", () => {
    expect(() => moodFormSchema.parse({ ...base, description: "", aiHint: "" })).not.toThrow();
  });

  it.each(["", "a", "x".repeat(41)])("rejette un nom hors bornes : %j", (name) => {
    expect(() => moodFormSchema.parse({ ...base, name })).toThrow();
  });

  it("rejette une consigne IA au-delà de la limite", () => {
    expect(() => moodFormSchema.parse({ ...base, aiHint: "x".repeat(MOOD_AI_HINT_MAX_LENGTH + 1) })).toThrow();
    expect(() => moodFormSchema.parse({ ...base, aiHint: "x".repeat(MOOD_AI_HINT_MAX_LENGTH) })).not.toThrow();
  });

  it.each(["abc", "1", "<b>", ""])("rejette un « emoji » qui n'en est pas un : %j", (emoji) => {
    expect(() => moodFormSchema.parse({ ...base, emoji })).toThrow();
  });

  it("rejette un état ou un ordre invalide", () => {
    expect(() => moodFormSchema.parse({ ...base, active: "peut-être" })).toThrow();
    expect(() => moodFormSchema.parse({ ...base, sortOrder: "-1" })).toThrow();
  });
});

describe("autres schémas", () => {
  it("toggleMoodSchema exige un identifiant et un état", () => {
    expect(toggleMoodSchema.parse({ id: "m1", active: "false" })).toEqual({ id: "m1", active: "false" });
    expect(() => toggleMoodSchema.parse({ id: "", active: "true" })).toThrow();
  });

  it("reorderMoodsSchema refuse les doublons et le JSON invalide", () => {
    expect(reorderMoodsSchema.parse({ order: JSON.stringify(["a", "b"]) }).order).toEqual(["a", "b"]);
    expect(() => reorderMoodsSchema.parse({ order: JSON.stringify(["a", "a"]) })).toThrow();
    expect(() => reorderMoodsSchema.parse({ order: "pas du json" })).toThrow();
  });

  it("slugifyMood retire accents et caractères spéciaux", () => {
    expect(slugifyMood("Épique & Mystérieuse !")).toBe("epique-mysterieuse");
  });
});

describe("catalogue par défaut", () => {
  it("garde les 6 ambiances historiques, dans l'ordre, avec un emoji du catalogue et une consigne dans la limite", () => {
    expect(DEFAULT_MOODS.map((mood) => mood.name)).toEqual([
      "Énergique",
      "Romantique",
      "Épique",
      "Joyeuse",
      "Dramatique",
      "Mystique",
    ]);
    for (const mood of DEFAULT_MOODS) {
      expect(isMoodEmoji(mood.emoji)).toBe(true);
      expect(mood.aiHint.length).toBeLessThanOrEqual(MOOD_AI_HINT_MAX_LENGTH);
    }
  });

  it("est identique à la migration 0057 (mêmes noms, emojis et consignes)", () => {
    const sql = readFileSync(path.resolve(__dirname, "../db/migrations/0057_moods_catalog.sql"), "utf8");
    for (const mood of DEFAULT_MOODS) {
      expect(sql).toContain(
        `'${mood.id}', '${mood.name}', '${mood.slug}', '${mood.description}', '${mood.emoji}', '${mood.aiHint}'`,
      );
    }
  });
});

describe("prompt Musicful avec ambiance", () => {
  it("buildMoodText : « Nom (consigne) » ou le nom seul", () => {
    expect(buildMoodText("Nostalgique", "nostalgic, warm")).toBe("Nostalgique (nostalgic, warm)");
    expect(buildMoodText("Nostalgique", "  ")).toBe("Nostalgique");
    expect(buildMoodText("Nostalgique")).toBe("Nostalgique");
  });

  it("ne dépasse jamais la limite de Musicful, même avec une description de genre très longue et une consigne maximale", () => {
    const mood = buildMoodText("Nostalgique", "x".repeat(MOOD_AI_HINT_MAX_LENGTH));
    const prompt = buildStylePrompt("Amapiano", "d".repeat(2000), mood, true);
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
  });

  it("conserve l'ambiance et les directives quand la description du genre est tronquée", () => {
    const mood = buildMoodText("Nostalgique", "nostalgic, warm, bittersweet");
    const prompt = buildStylePrompt("Amapiano", "d ".repeat(900), mood, true);
    expect(prompt).toContain("Ambiance : Nostalgique (nostalgic, warm, bittersweet)");
    expect(prompt).toContain("Termine la chanson par un outro naturel");
  });
});
