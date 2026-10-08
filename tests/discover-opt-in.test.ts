import { describe, expect, it } from "vitest";
import { songGenerateRequestSchema } from "@/lib/validation/ai";

const base = { occasion: "Anniversaire", genre: "Afrobeat", lyrics: "Paroles", occasionDetails: [] };

describe("« Découvrir » sur demande", () => {
  it("ne partage rien par défaut à la génération", () => {
    expect(songGenerateRequestSchema.parse(base).shareToDiscover).toBe(false);
  });

  it("accepte le partage choisi par le client", () => {
    expect(songGenerateRequestSchema.parse({ ...base, shareToDiscover: true }).shareToDiscover).toBe(true);
  });

  it("refuse une valeur qui n'est pas un booléen (aucune conversion implicite)", () => {
    expect(songGenerateRequestSchema.safeParse({ ...base, shareToDiscover: "true" }).success).toBe(false);
  });
});
