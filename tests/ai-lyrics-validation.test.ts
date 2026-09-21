import { describe, expect, it } from "vitest";
import { aiLyricsTaskSchema, openAiSettingsSchema } from "@/lib/validation/ai";

const context = {
  occasion: "Anniversaire",
  story: "Une amitié née à Abidjan et entretenue depuis dix ans.",
  recipientName: "Awa",
  recipientRelation: "Amie",
  recipientPronunciation: "A-wa",
  genre: "Afrobeat",
  mood: "Joyeuse",
  language: "Français",
  voice: "Féminine",
  additionalDetails: "Inclure un refrain facile à retenir.",
};

describe("AI lyrics validation", () => {
  it("accepts the full creation context", () => {
    expect(aiLyricsTaskSchema.safeParse({ task: "lyrics.generate", input: context }).success).toBe(true);
  });

  it("requires existing lyrics for extension", () => {
    expect(aiLyricsTaskSchema.safeParse({ task: "lyrics.extend", input: context }).success).toBe(false);
  });

  it("accepts an empty API key to preserve the encrypted key", () => {
    expect(
      openAiSettingsSchema.safeParse({
        apiKey: "",
        enabled: "true",
        defaultModel: "gpt-5.6-terra",
        maxOutputTokens: "4000",
        requestsPerMinute: "10",
        lyricsGenerationEnabled: "true",
        lyricsRewriteEnabled: "true",
        isDefaultForLyrics: "true",
      }).success,
    ).toBe(true);
  });
});
