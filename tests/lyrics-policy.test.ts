import { describe, expect, it } from "vitest";
import {
  enforceLyricsWordLimit,
  estimateLyricsDurationSeconds,
  formatLyricsDuration,
  LYRICS_MAX_WORDS,
} from "@/lib/ai/lyrics-policy";

describe("lyrics policy", () => {
  it(`limits provider output to ${LYRICS_MAX_WORDS} words`, () => {
    const result = enforceLyricsWordLimit(Array(LYRICS_MAX_WORDS + 1).fill("mot").join(" "));
    expect(result.split(/\s+/)).toHaveLength(LYRICS_MAX_WORDS);
  });

  it("estimates duration from the generated word count and caps it at four minutes", () => {
    expect(formatLyricsDuration(estimateLyricsDurationSeconds(197))).toBe("~1:19");
    expect(formatLyricsDuration(estimateLyricsDurationSeconds(900))).toBe("~4:00");
  });
});

describe("stripLyricsMarkdown", () => {
  it("removes Markdown title and bold markers but keeps the section tags and sung lines", async () => {
    const { stripLyricsMarkdown } = await import("../lib/ai/lyrics-policy");
    const input = "# A-wa, Ma Force\n\n**[Couplet 1]**\nDix ans que tu es là\n**[Refrain]**\nA-wa, A-wa\n\n\n\n**[Pont]**\nMerci";
    expect(stripLyricsMarkdown(input)).toBe(
      "A-wa, Ma Force\n\n[Couplet 1]\nDix ans que tu es là\n[Refrain]\nA-wa, A-wa\n\n[Pont]\nMerci",
    );
  });

  it("leaves plain lyrics unchanged", async () => {
    const { stripLyricsMarkdown } = await import("../lib/ai/lyrics-policy");
    expect(stripLyricsMarkdown("Ligne 1\nLigne 2")).toBe("Ligne 1\nLigne 2");
  });
});

describe("stripLyricsTitleLine", () => {
  it("retire une première ligne étiquetée « Paroles : … » et garde les lignes chantées", async () => {
    const { stripLyricsTitleLine } = await import("../lib/ai/lyrics-policy");
    expect(stripLyricsTitleLine("Paroles : Aïcha, mon amour\n\n[Couplet 1]\nTu es ma lumière")).toBe(
      "[Couplet 1]\nTu es ma lumière",
    );
    expect(stripLyricsTitleLine("Lyrics: Test\n[Refrain]\nLa la")).toBe("[Refrain]\nLa la");
    expect(stripLyricsTitleLine("\nTitre : Joyeux anniversaire\nLigne 1")).toBe("Ligne 1");
  });

  it("laisse intacts un titre sans étiquette et des paroles normales", async () => {
    const { stripLyricsTitleLine } = await import("../lib/ai/lyrics-policy");
    expect(stripLyricsTitleLine("A-wa, Ma Force\n[Couplet 1]\nDix ans")).toBe("A-wa, Ma Force\n[Couplet 1]\nDix ans");
    expect(stripLyricsTitleLine("[Couplet 1]\nParoles : sans valeur ici")).toBe(
      "[Couplet 1]\nParoles : sans valeur ici",
    );
  });
});
