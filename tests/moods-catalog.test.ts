import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMoodText,
  buildStylePrompt,
  buildVocalHint,
  MUSICFUL_STYLE_MAX_LENGTH,
} from "@/lib/ai/style-prompt-builder";
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
      expect((mood.aiHint ?? "").length).toBeLessThanOrEqual(MOOD_AI_HINT_MAX_LENGTH);
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
  it("buildMoodText : la consigne anglaise remplace le nom ; sans consigne, repli sur le nom", () => {
    expect(buildMoodText("Nostalgique", "nostalgic, warm")).toBe("nostalgic, warm");
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
    expect(prompt).toContain("Mood: nostalgic, warm, bittersweet");
    expect(prompt).not.toContain("Nostalgique");
    expect(prompt).toContain("End the song with a natural outro");
  });
});

describe("prompt Musicful avec consigne d'occasion", () => {
  it("n'ajoute rien pour l'occasion sans consigne (le nom français n'est jamais envoyé)", () => {
    const prompt = buildStylePrompt("Zouglou", null, "romantic", true, "");
    expect(prompt).not.toContain("Occasion");
  });

  it("n'envoie que la consigne anglaise de l'occasion", () => {
    const prompt = buildStylePrompt("Zouglou", null, "romantic", true, "birthday celebration, joyful");
    expect(prompt).toContain("Occasion: birthday celebration, joyful");
    expect(prompt).not.toContain("Anniversaire");
  });

  it("ne dépasse jamais la limite de Musicful avec ambiance, occasion et très longue description de genre", () => {
    const prompt = buildStylePrompt("Amapiano", "d ".repeat(900), "m".repeat(150), true, "o".repeat(150));
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
    expect(prompt).toContain("Occasion: " + "o".repeat(150));
    expect(prompt).toContain("End the song with a natural outro");
  });
});

describe("migration 0058 (consignes d'occasion)", () => {
  const sql = readFileSync(path.resolve(__dirname, "../db/migrations/0058_occasions_ai_hint.sql"), "utf8");

  it("est idempotente et ne remplace jamais une consigne déjà saisie", () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "ai_hint"');
    const updates = sql.split("\n").filter((line) => line.startsWith("UPDATE"));
    expect(updates.length).toBe(10);
    for (const line of updates) expect(line).toContain(`AND "ai_hint" = ''`);
  });

  it("garde chaque consigne de départ dans la limite", () => {
    for (const match of sql.matchAll(/SET "ai_hint" = '([^']*)'/g)) {
      expect(match[1].length).toBeLessThanOrEqual(150);
    }
  });
});

describe("migration 0059 (consignes de style en anglais)", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../db/migrations/0059_music_styles_english_ai_description.sql"),
    "utf8",
  );
  const updates = sql.split("\n").filter((line) => line.startsWith("UPDATE"));

  it("ne remplace que les consignes encore en français (accents), jamais une consigne anglaise déjà saisie", () => {
    expect(updates.length).toBe(12);
    for (const line of updates) expect(line).toContain(`"ai_description" ~ '[^\\x01-\\x7F]'`);
  });

  it("garde chaque consigne anglaise dans la limite de 600 caractères et sans accent", () => {
    for (const match of sql.matchAll(/SET "ai_description" = '((?:[^']|'')*)'/g)) {
      expect(match[1].length).toBeLessThanOrEqual(600);
      expect(/^[\x00-\x7F]*$/.test(match[1])).toBe(true);
    }
  });
});

describe("consigne de style préfixée par le nom", () => {
  it("n'envoie le nom du style qu'une seule fois à Musicful", () => {
    const prompt = buildStylePrompt("R&B", "R&B: BPM 90-110, swing groove", "", false);
    expect(prompt.startsWith("R&B — BPM 90-110, swing groove")).toBe(true);
    expect(prompt.match(/R&B/g)?.length).toBe(1);
  });

  it("la migration 0060 est idempotente (ne préfixe pas deux fois)", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../db/migrations/0060_music_styles_ai_description_name_prefix.sql"),
      "utf8",
    );
    expect(sql).toContain(`<> lower("name") || ':'`);
  });
});

describe("consigne vocale (voix + langue) en anglais", () => {
  it("convertit les choix français en anglais", () => {
    expect(buildVocalHint("Français", "Femme")).toBe("female lead vocals, sung in French");
    expect(buildVocalHint("Anglais", "Homme")).toBe("male lead vocals, sung in English");
    expect(buildVocalHint("Français", "Duo")).toBe("male and female duet vocals, sung in French");
  });

  it("n'ajoute rien pour une valeur inconnue", () => {
    expect(buildVocalHint("Wolof", "")).toBe("");
  });

  it("l'ajoute au prompt sans dépasser la limite de Musicful", () => {
    const prompt = buildStylePrompt(
      "Amapiano",
      "d ".repeat(900),
      "m".repeat(150),
      true,
      "o".repeat(150),
      "male and female duet vocals, sung in French",
    );
    expect(prompt).toContain("Vocals: male and female duet vocals, sung in French");
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
  });
});
