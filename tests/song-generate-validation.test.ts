import { describe, expect, it } from "vitest";
import { songGenerateRequestSchema } from "@/lib/validation/ai";

describe("Song generation request validation", () => {
  it("accepts the minimal wizard payload (occasion, genre, lyrics)", () => {
    expect(
      songGenerateRequestSchema.safeParse({
        occasion: "Anniversaire",
        genre: "Afrobeat",
        lyrics: "Pour toi Mariam, ce jour est béni…",
      }).success,
    ).toBe(true);
  });

  it("rejects a request missing lyrics", () => {
    expect(songGenerateRequestSchema.safeParse({ occasion: "Anniversaire", genre: "Afrobeat" }).success).toBe(false);
  });

  it("rejects a request missing the occasion", () => {
    expect(songGenerateRequestSchema.safeParse({ genre: "Afrobeat", lyrics: "…" }).success).toBe(false);
  });
});
