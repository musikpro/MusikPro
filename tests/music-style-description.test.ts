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
  aiDescriptionPrompt,
  generateMusicStyleDescription,
  STYLE_AI_REFERENCE_EXAMPLES,
} from "@/lib/ai/music-style-description";
import { STYLE_AI_DESCRIPTION_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

describe("consigne IA d'un style : modèle de référence", () => {
  it("les deux exemples validés tiennent dans la limite du champ", () => {
    for (const example of STYLE_AI_REFERENCE_EXAMPLES) {
      expect(example.text.length).toBeLessThanOrEqual(STYLE_AI_DESCRIPTION_MAX_LENGTH);
      expect([3, 4]).toContain(example.text.split(/(?<=\.)\s/).length);
    }
  });

  it("la demande au modèle contient les exemples et les règles de forme", () => {
    const prompt = aiDescriptionPrompt("Zouglou");
    for (const example of STYLE_AI_REFERENCE_EXAMPLES) expect(prompt).toContain(example.text);
    expect(prompt).toContain('Musical style: "Zouglou"');
    expect(prompt).toContain("3 or 4 sentences");
    expect(prompt).toContain("NN-NN BPM");
    expect(prompt).toContain("ENGLISH ONLY");
    expect(prompt).toContain(`hard limit ${STYLE_AI_DESCRIPTION_MAX_LENGTH}`);
    expect(prompt).toContain("Do NOT state the singer's gender");
  });
});

describe("generateMusicStyleDescription (consigne IA)", () => {
  beforeEach(() => runProviderTextTask.mockReset());

  it("renvoie le texte sans préfixe « Nom : » (le nom est dans la première phrase)", async () => {
    const example = STYLE_AI_REFERENCE_EXAMPLES[1].text;
    runProviderTextTask.mockResolvedValue({ id: "r1", text: `Coupé-Décalé: ${example}` });
    const result = await generateMusicStyleDescription({ styleName: "Coupé-Décalé", kind: "ai" });
    expect(result.text).toBe(example);
  });

  it("garde le texte intact s'il commence par le nom du style sans deux-points", async () => {
    const example = STYLE_AI_REFERENCE_EXAMPLES[0].text;
    runProviderTextTask.mockResolvedValue({ id: "r2", text: example });
    const result = await generateMusicStyleDescription({ styleName: "Afrobeats / Naija Pop", kind: "ai" });
    expect(result.text).toBe(example);
  });

  it("coupe à la dernière phrase complète sous 420 caractères", async () => {
    const long = `${STYLE_AI_REFERENCE_EXAMPLES[0].text} ${STYLE_AI_REFERENCE_EXAMPLES[1].text}`;
    runProviderTextTask.mockResolvedValue({ id: "r3", text: long });
    const result = await generateMusicStyleDescription({ styleName: "Afrobeats", kind: "ai" });
    expect(result.text.length).toBeLessThanOrEqual(STYLE_AI_DESCRIPTION_MAX_LENGTH);
    expect(result.text.endsWith(".")).toBe(true);
  });

  it("la description client reste de cinq mots", async () => {
    runProviderTextTask.mockResolvedValue({
      id: "r4",
      text: "Ivoirienne, festive, sociale, rythmée, engagée, entraînante",
    });
    const result = await generateMusicStyleDescription({ styleName: "Zouglou", kind: "client" });
    expect(result.text.split(/[\s,]+/).filter(Boolean)).toHaveLength(5);
  });
});

describe("stripLeadingPreamble", () => {
  it("retire l'introduction ajoutée après une recherche web", async () => {
    const { stripLeadingPreamble } = await import("@/lib/ai/music-style-description");
    expect(
      stripLeadingPreamble(
        "Based on my research, here is the style instruction for the Zouglou music genre: Ivorian Zouglou, 100-125 BPM, congas.",
      ),
    ).toBe("Ivorian Zouglou, 100-125 BPM, congas.");
  });
  it("laisse une consigne normale intacte", async () => {
    const { stripLeadingPreamble } = await import("@/lib/ai/music-style-description");
    const text = "Ivorian Zouglou, 100-125 BPM, congas. Festive vibes.";
    expect(stripLeadingPreamble(text)).toBe(text);
  });
});
