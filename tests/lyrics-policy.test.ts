import { describe, expect, it } from "vitest";
import {
  enforceLyricsWordLimit,
  estimateLyricsDurationSeconds,
  formatLyricsDuration,
  LYRICS_MAX_WORDS,
} from "@/lib/ai/lyrics-policy";

describe("lyrics policy", () => {
  it("limits provider output to 900 words", () => {
    const result = enforceLyricsWordLimit(Array(901).fill("mot").join(" "));
    expect(result.split(/\s+/)).toHaveLength(LYRICS_MAX_WORDS);
  });

  it("estimates duration from the generated word count and caps it at four minutes", () => {
    expect(formatLyricsDuration(estimateLyricsDurationSeconds(197))).toBe("~1:19");
    expect(formatLyricsDuration(estimateLyricsDurationSeconds(900))).toBe("~4:00");
  });
});
