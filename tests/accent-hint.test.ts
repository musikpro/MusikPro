import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const runProviderTextTask = vi.fn();
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "test" })) }));
vi.mock("@/lib/ai/text-generation", () => ({
  runProviderTextTask: (...args: unknown[]) => runProviderTextTask(...args),
}));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn(async () => ({ flagged: false, categories: [] })) }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import {
  accentHintPrompt,
  accentResearchPrompt,
  ACCENT_HINT_REFERENCE_EXAMPLE,
  generateAccentHint,
  looksLikeAccentHint,
} from "@/lib/ai/accent-hint";
import { accentHintRequestSchema } from "@/lib/validation/ai";
import { languageAccentSchema } from "@/lib/validation/language-accents";
import { ACCENT_HINT_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

const input = { languageName: "Français", country: "Côte d’Ivoire", styleNames: ["Zouglou", "Coupé-décalé"] };
const good = "natural Ivorian French accent, Abidjan urban vocal style, authentic Côte d’Ivoire pronunciation";
const notes = { id: "n", text: "- Nouchi slang\n- Abidjan", model: "m", webSearch: "used" };

describe("prompts de la consigne d'accent", () => {
  it("la recherche donne le pays (en français), la langue et les styles, et demande des notes en anglais", () => {
    const prompt = accentResearchPrompt(input);
    expect(prompt).toContain("Côte d’Ivoire");
    expect(prompt).toContain("Français");
    expect(prompt).toContain("Zouglou, Coupé-décalé");
    expect(prompt).toContain("web search tool");
    expect(prompt).toContain("Translate the country name into English");
  });

  it("la rédaction impose l'anglais, l'exemple validé, la limite et n'ajoute pas l'évitement (ajouté ailleurs)", () => {
    const prompt = accentHintPrompt(input, "- note");
    expect(prompt).toContain(ACCENT_HINT_REFERENCE_EXAMPLE);
    expect(prompt).toContain("ENGLISH ONLY");
    expect(prompt).toContain(`hard limit ${ACCENT_HINT_MAX_LENGTH}`);
    expect(prompt).toContain("- note");
    expect(prompt).toContain("Do NOT mention European, Western");
  });
});

describe("generateAccentHint", () => {
  beforeEach(() => runProviderTextTask.mockReset());

  it("cherche sur le web puis rédige sans outil", async () => {
    runProviderTextTask.mockResolvedValueOnce(notes).mockResolvedValueOnce({ id: "w", text: good, model: "m" });
    const result = await generateAccentHint(input);
    expect(runProviderTextTask.mock.calls[0][3]).toEqual({ webSearch: true });
    expect(runProviderTextTask.mock.calls[1][3]).toEqual({ webSearch: false });
    expect(result.text).toBe(good);
    expect(result.webSearch).toBe("used");
  });

  it("redemande si la réponse est un commentaire de recherche, puis refuse si c'est toujours hors format", async () => {
    const commentary = "Based on my research, Ivorian French is spoken in Abidjan.";
    runProviderTextTask
      .mockResolvedValueOnce(notes)
      .mockResolvedValueOnce({ id: "1", text: commentary, model: "m" })
      .mockResolvedValueOnce({ id: "2", text: good, model: "m" });
    expect((await generateAccentHint(input)).text).toBe(good);

    runProviderTextTask.mockReset();
    runProviderTextTask.mockResolvedValueOnce(notes).mockResolvedValue({ id: "x", text: commentary, model: "m" });
    await expect(generateAccentHint(input)).rejects.toThrow("AI_BAD_FORMAT");
  });

  it("garde une seule ligne sous la limite du champ", async () => {
    const long = `${good}, ${"vivid local phrase, ".repeat(30)}`;
    runProviderTextTask
      .mockResolvedValueOnce(notes)
      .mockResolvedValueOnce({ id: "w", text: `${long}\nsecond line`, model: "m" });
    const result = await generateAccentHint(input);
    expect(result.text.length).toBeLessThanOrEqual(ACCENT_HINT_MAX_LENGTH);
    expect(result.text).not.toMatch(/[\r\n]/);
  });
});

describe("looksLikeAccentHint", () => {
  it("accepte une consigne d'accent et rejette un commentaire", () => {
    expect(looksLikeAccentHint(good)).toBe(true);
    expect(looksLikeAccentHint("Based on my research, the accent is warm.")).toBe(false);
    expect(looksLikeAccentHint("urban vocal style")).toBe(false);
  });
});

describe("validation", () => {
  it("le pays est optionnel à l'enregistrement (rétrocompatible) et tient sur une ligne", () => {
    const base = {
      languageCode: "fr",
      name: "Français ivoirien",
      aiHint: good,
      active: "true",
      sortOrder: "100",
      styleIds: [],
    };
    expect(languageAccentSchema.parse(base).country).toBe("");
    expect(languageAccentSchema.parse({ ...base, country: "Côte d’Ivoire" }).country).toBe("Côte d’Ivoire");
    expect(languageAccentSchema.safeParse({ ...base, country: "Côte\nd’Ivoire" }).success).toBe(false);
  });

  it("la demande de génération exige la langue et le pays", () => {
    expect(accentHintRequestSchema.safeParse({ languageName: "Français", country: "" }).success).toBe(false);
    expect(accentHintRequestSchema.parse({ languageName: "Français", country: "Ghana" }).styleNames).toEqual([]);
  });
});

describe("migration 0073", () => {
  it("ajoute la colonne pays de façon idempotente, sans toucher aux accents existants", () => {
    const sql = readFileSync(path.resolve(__dirname, "../db/migrations/0073_accent_country.sql"), "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS \"country\" text DEFAULT '' NOT NULL");
    expect(sql).not.toMatch(/DROP|DELETE|UPDATE/i);
  });
});

describe("la route de génération envoie l'évitement à toutes les chansons", () => {
  it("passe par buildVocalHint, qui ajoute « avoid European or Western accents »", () => {
    const route = readFileSync(path.resolve(__dirname, "../app/api/songs/generate/route.ts"), "utf8");
    expect(route).toContain("buildVocalHint(input.language, input.voice, await resolveAccentHint(");
  });
});
