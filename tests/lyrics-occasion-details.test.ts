import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn() }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn() }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { promptFor } from "@/lib/ai/lyrics";
import { aiLyricsTaskSchema, songGenerateRequestSchema } from "@/lib/validation/ai";
import type { ResolvedAnswer } from "@/lib/occasion-fields/types";

const input = {
  occasion: "Spot publicitaire",
  story: "Un café qui réveille Abidjan.",
  genre: "Afrobeat",
  language: "Français",
  voice: "Femme",
};

const answers: ResolvedAnswer[] = [
  { fieldId: "p", key: "product_name", label: "Nom du produit", type: "short_text", value: "Café Soleil", aiHint: "Repeat it in the chorus." },
];

describe("occasionDetails in schemas", () => {
  it("defaults to an empty list (existing clients keep working)", () => {
    const parsed = aiLyricsTaskSchema.parse({ task: "lyrics.generate", input });
    expect(parsed.input.occasionDetails).toEqual([]);
    expect(songGenerateRequestSchema.parse({ occasion: "x", genre: "y", lyrics: "z" }).occasionDetails).toEqual([]);
  });

  it("rejects more than 8 answers and over-long values", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ fieldId: `f${i}`, value: "x" }));
    expect(aiLyricsTaskSchema.safeParse({ task: "lyrics.generate", input: { ...input, occasionDetails: many } }).success).toBe(false);
    expect(
      aiLyricsTaskSchema.safeParse({
        task: "lyrics.generate",
        input: { ...input, occasionDetails: [{ fieldId: "f", value: "x".repeat(601) }] },
      }).success,
    ).toBe(false);
  });
});

describe("promptFor with occasion details", () => {
  const task = aiLyricsTaskSchema.parse({ task: "lyrics.generate", input });

  it("adds the personalised block with the AI hint", () => {
    const prompt = promptFor(task, answers);
    expect(prompt).toContain("Informations personnalisées:");
    expect(prompt).toContain("- Nom du produit : Café Soleil (consigne : Repeat it in the chorus.)");
  });

  it("is unchanged without details", () => {
    expect(promptFor(task)).not.toContain("Informations personnalisées");
    expect(promptFor(task, [])).toBe(promptFor(task));
  });

  it("applies to extend and rewrite tasks too", () => {
    const extend = aiLyricsTaskSchema.parse({
      task: "lyrics.extend",
      input: { ...input, lyrics: "Premier couplet de la chanson qui continue ici." },
    });
    expect(promptFor(extend, answers)).toContain("Café Soleil");
  });
});
