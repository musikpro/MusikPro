import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMoodText,
  buildStylePrompt,
  AVOID_WESTERN_ACCENT_HINT,
  buildVocalHint,
  MUSICFUL_STYLE_MAX_LENGTH,
  STYLE_AI_DESCRIPTION_MAX_LENGTH,
} from "@/lib/ai/style-prompt-builder";
import { OCCASION_AI_HINT_MAX_LENGTH } from "@/lib/occasions/catalog";
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
    const prompt = buildStylePrompt(
      "Amapiano",
      "d ".repeat(900),
      "m".repeat(MOOD_AI_HINT_MAX_LENGTH),
      true,
      "o".repeat(OCCASION_AI_HINT_MAX_LENGTH),
    );
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
    expect(prompt).toContain("Occasion: " + "o".repeat(OCCASION_AI_HINT_MAX_LENGTH));
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
    expect(buildVocalHint("Français", "Femme")).toBe(
      `female lead vocals, sung in French, ${AVOID_WESTERN_ACCENT_HINT}`,
    );
    expect(buildVocalHint("Anglais", "Homme")).toBe(`male lead vocals, sung in English, ${AVOID_WESTERN_ACCENT_HINT}`);
    expect(buildVocalHint("Français", "Duo")).toBe(
      `male and female duet vocals, sung in French, ${AVOID_WESTERN_ACCENT_HINT}`,
    );
  });

  it("n'ajoute que l'évitement des accents européens/occidentaux pour une valeur inconnue", () => {
    expect(buildVocalHint("Wolof", "")).toBe(AVOID_WESTERN_ACCENT_HINT);
  });

  it("l'ajoute au prompt sans dépasser la limite de Musicful", () => {
    const prompt = buildStylePrompt(
      "Amapiano",
      "d ".repeat(900),
      "m".repeat(MOOD_AI_HINT_MAX_LENGTH),
      true,
      "o".repeat(OCCASION_AI_HINT_MAX_LENGTH),
      "male and female duet vocals, sung in French",
    );
    expect(prompt).toContain("Vocals: male and female duet vocals, sung in French");
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
  });
});

describe("mode strict : la phrase de rigueur n'est jamais coupée", () => {
  it("raccourcit la description, pas la phrase", () => {
    const prompt = buildStylePrompt(
      "Afrobeat",
      "d ".repeat(400),
      "joyful, fun, cheerful, feel-good, bright",
      true,
      "o".repeat(OCCASION_AI_HINT_MAX_LENGTH),
      "male and female duet vocals, sung in French",
    );
    expect(prompt).toContain("without drifting toward a more generic genre.");
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
  });
});

describe("régression production : une consigne de style réelle n'est pas tronquée", () => {
  it("garde l'origine complète du R&B en mode strict avec ambiance, occasion et voix", () => {
    const rnb =
      "R&B: BPM 90-110 | Shuffled triplet swing groove | Funk-jazz drums, syncopated hi-hat | Melodic groovy bass, bent notes | Rhodes keys, soul guitar, lush strings | Spoken/sung verses, repeated melodic chorus | Warm voice, legato, vibrato | Thick vocal harmonies, ad-libs | Moderate sensual energy | Intimate, nocturnal, romantic mood | Origins: USA (Memphis, Motown, New Orleans)";
    const prompt = buildStylePrompt(
      "R&B",
      rnb,
      "romantic, tender, warm, heartfelt, intimate",
      true,
      "birthday celebration, joyful, warm, heartfelt tribute",
      "male and female duet vocals, sung in French",
    );
    expect(prompt).toContain("Origins: USA (Memphis, Motown, New Orleans)");
    expect(prompt).toContain("without drifting toward a more generic genre.");
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
  });
});

describe("limites de longueur : rien n'est tronqué même au maximum", () => {
  it("un cas réaliste (nom, ambiance et occasion de longueur courante) n'est pas tronqué", () => {
    const name = "N".repeat(20);
    const description = `${name}: ${"w".repeat(STYLE_AI_DESCRIPTION_MAX_LENGTH - name.length - 2)}`;
    const prompt = buildStylePrompt(
      name,
      description,
      "m".repeat(40),
      true,
      "o".repeat(40),
      buildVocalHint("Français", "Duo"),
    );
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
    expect(prompt).toContain("w".repeat(STYLE_AI_DESCRIPTION_MAX_LENGTH - name.length - 2));
  });

  it("le pire cas absolu (nom de 60 caractères, ambiance et occasion au maximum) tient dans Musicful ; seule la description du genre peut perdre quelques mots", () => {
    const name = "N".repeat(60);
    const description = `${name}: ${"w ".repeat(STYLE_AI_DESCRIPTION_MAX_LENGTH)}`.slice(
      0,
      STYLE_AI_DESCRIPTION_MAX_LENGTH,
    );
    const vocal = buildVocalHint("Français", "Duo");
    const prompt = buildStylePrompt(
      name,
      description,
      "m".repeat(MOOD_AI_HINT_MAX_LENGTH),
      true,
      "o".repeat(OCCASION_AI_HINT_MAX_LENGTH),
      vocal,
    );
    expect(prompt.length).toBeLessThanOrEqual(MUSICFUL_STYLE_MAX_LENGTH);
    // La consigne vocale (accent compris), l'ambiance, l'occasion, la phrase de rigueur et les directives ne sont jamais coupées.
    expect(prompt).toContain(`Vocals: ${vocal}`);
    expect(prompt).toContain("m".repeat(MOOD_AI_HINT_MAX_LENGTH));
    expect(prompt).toContain("o".repeat(OCCASION_AI_HINT_MAX_LENGTH));
    expect(prompt).toContain("without drifting toward a more generic genre.");
    expect(prompt).toContain("End the song with a natural outro");
  });
});

describe("migration 0061 (remboursement des générations échouées + limites de style)", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../db/migrations/0061_refund_failed_generation_and_style_limits.sql"),
    "utf8",
  );

  it("ajoute les colonnes de façon idempotente", () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "credits_charged"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "credits_refunded_at"');
  });

  it("ne raccourcit que les consignes de style qui dépassent la limite, en restant dans la limite", () => {
    const updates = sql.split("\n").filter((line) => line.startsWith("UPDATE"));
    expect(updates.length).toBe(5);
    for (const line of updates) expect(line).toContain(`length("ai_description") > ${STYLE_AI_DESCRIPTION_MAX_LENGTH}`);
    for (const match of sql.matchAll(/SET "ai_description" = '((?:[^']|'')*)'/g)) {
      expect(match[1].length).toBeLessThanOrEqual(STYLE_AI_DESCRIPTION_MAX_LENGTH);
    }
  });
});

describe("remboursement automatique d'une génération échouée", () => {
  const source = readFileSync(path.resolve(__dirname, "../lib/credits/generation-refund.ts"), "utf8");

  it("rembourse en une seule instruction atomique, uniquement si toutes les versions ont échoué et sans doublon", () => {
    expect(source).toContain("credits_refunded_at IS NULL");
    expect(source).toContain("credits_charged > 0");
    expect(source).toContain("other.status NOT IN ('failed', 'cancelled')");
    expect(source).toContain("UPDATE credits");
  });

  it("est branché sur le suivi des tâches et sur le lancement de la génération", () => {
    const dispatch = readFileSync(path.resolve(__dirname, "../lib/ai/audio-providers/dispatch.ts"), "utf8");
    expect(dispatch).toContain("refundSongGroupIfFailed(userId, job.songGroupId)");
    const route = readFileSync(path.resolve(__dirname, "../app/api/songs/generate/route.ts"), "utf8");
    expect(route).toContain("recordSongGroupCharge(session.user.id, songGroupId, CREDITS_PER_GENERATION)");
  });
});
