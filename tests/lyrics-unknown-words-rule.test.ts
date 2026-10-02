import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn() }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn() }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { promptFor } from "@/lib/ai/lyrics";
import { UNKNOWN_WORDS_PRONUNCIATION_RULE } from "@/lib/ai/lyrics-policy";
import type { AiLyricsTask } from "@/lib/validation/ai";

const input = {
  occasion: "Amour",
  story: "Née à Boundiali.",
  recipientName: "Awa",
  recipientRelation: "Épouse",
  recipientPronunciation: "A-wa",
  senderName: "Issa",
  senderPronunciation: "I-ssa",
  genre: "Afrobeat",
  mood: "Joyeuse",
  language: "Français",
  voice: "Duo",
  additionalDetails: "",
  occasionDetails: [],
};

describe("unknown words pronunciation rule", () => {
  it("only splits words into syllables — it never rewrites letters", () => {
    expect(UNKNOWN_WORDS_PRONUNCIATION_RULE).toContain("Boundiali -> Boun-dia-li");
    expect(UNKNOWN_WORDS_PRONUNCIATION_RULE).toContain("garde exactement les mêmes lettres");
  });

  it.each<[string, AiLyricsTask]>([
    ["lyrics.generate", { task: "lyrics.generate", input }],
    ["lyrics.extend", { task: "lyrics.extend", input: { ...input, lyrics: "Couplet" } }],
    ["lyrics.rewrite", { task: "lyrics.rewrite", input: { ...input, lyrics: "Couplet", instruction: "Plus court" } }],
  ])("is part of the %s prompt", (_name, task) => {
    expect(promptFor(task)).toContain(UNKNOWN_WORDS_PRONUNCIATION_RULE);
  });
});
