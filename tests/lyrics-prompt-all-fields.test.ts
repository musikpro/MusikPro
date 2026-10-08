import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn() }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn() }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { promptFor } from "@/lib/ai/lyrics";
import { aiLyricsTaskSchema } from "@/lib/validation/ai";
import type { ResolvedAnswer } from "@/lib/occasion-fields/types";

/** Chaque champ du parcours de création reçoit une valeur unique : si l'une manque dans la demande à l'IA, le test échoue. */
const input = {
  occasion: "OCC_Mariage",
  story: "STORY_nous nous sommes rencontrés sous la pluie",
  recipientName: "NAME_Aïcha",
  recipientRelation: "REL_Épouse",
  recipientPronunciation: "PRON_Aï-cha",
  senderName: "SENDER_Moussa",
  senderPronunciation: "SPRON_Mou-ssa",
  genre: "GENRE_Afrobeat",
  mood: "MOOD_Nostalgique",
  language: "LANG_Français",
  voice: "VOICE_Femme",
  additionalDetails: "DETAIL_son rire au marché",
};

const answers: ResolvedAnswer[] = [
  {
    fieldId: "a",
    key: "nickname",
    label: "Surnom affectueux",
    type: "short_text",
    value: "ANS_Mon cœur",
    aiHint: "HINT_use it in the bridge",
  },
  {
    fieldId: "b",
    key: "met",
    label: "Comment vous vous êtes rencontrés",
    type: "long_text",
    value: "ANS_à Abidjan",
    aiHint: "",
  },
];

describe("demande de paroles : tous les champs du parcours sont transmis à l'IA", () => {
  const task = aiLyricsTaskSchema.parse({ task: "lyrics.generate", input });

  it("la validation conserve chaque champ", () => {
    for (const [key, value] of Object.entries(input)) {
      expect((task.input as Record<string, unknown>)[key]).toBe(value);
    }
  });

  it("le texte envoyé à l'IA contient chaque valeur et chaque réponse personnalisée", () => {
    const prompt = promptFor(task, answers);
    for (const value of Object.values(input)) expect(prompt).toContain(value);
    expect(prompt).toContain("Surnom affectueux : ANS_Mon cœur (consigne : HINT_use it in the bridge)");
    expect(prompt).toContain("Comment vous vous êtes rencontrés : ANS_à Abidjan");
  });

  it("la réécriture et la rallonge gardent aussi tous les champs", () => {
    const extend = promptFor(
      aiLyricsTaskSchema.parse({ task: "lyrics.extend", input: { ...input, lyrics: "x".repeat(40) } }),
      answers,
    );
    const rewrite = promptFor(
      aiLyricsTaskSchema.parse({
        task: "lyrics.rewrite",
        input: { ...input, lyrics: "paroles", instruction: "plus court" },
      }),
      answers,
    );
    for (const prompt of [extend, rewrite]) {
      for (const value of Object.values(input)) expect(prompt).toContain(value);
    }
  });
});
