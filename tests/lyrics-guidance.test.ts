import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn() }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn() }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/ai/lyrics-guidance-server", () => ({ resolveLyricsGuidance: vi.fn() }));

import { buildLyricsGuidanceBlock, LYRICS_GUIDANCE_MAX_LENGTH } from "@/lib/ai/lyrics-guidance";
import { promptFor } from "@/lib/ai/lyrics";
import { aiLyricsTaskSchema } from "@/lib/validation/ai";

const input = {
  occasion: "Anniversaire",
  story: "Cynthia fête ses 30 ans, son mari Wilfried lui dédie une chanson.",
  recipientName: "Cynthia",
  recipientRelation: "Ma femme",
  recipientPronunciation: "Sin-tia",
  senderName: "Wilfried",
  senderPronunciation: "Wil-fried",
  genre: "Style Anniversaire",
  mood: "Joyeuse",
  language: "Français",
  voice: "Duo",
  additionalDetails: "",
};
const guidance = {
  occasion: "OCC_GUIDE féliciter pour l'âge fêté",
  style: "STYLE_GUIDE refrain joyeux anniversaire en chœur",
};

describe("consignes d'écriture des paroles (occasion + style)", () => {
  it("le bloc est vide sans consigne : comportement d'avant", () => {
    expect(buildLyricsGuidanceBlock({ occasion: "Anniversaire", style: "Rap" })).toBe("");
    expect(buildLyricsGuidanceBlock({ occasion: "A", style: "B" }, { occasion: "  ", style: "" })).toBe("");
  });

  it("le bloc nomme l'occasion et le style et contient chaque consigne", () => {
    const block = buildLyricsGuidanceBlock({ occasion: "Anniversaire", style: "Hip-Hop / Rap" }, guidance);
    expect(block).toContain("« Anniversaire »");
    expect(block).toContain("« Hip-Hop / Rap »");
    expect(block).toContain(guidance.occasion);
    expect(block).toContain(guidance.style);
  });

  it("une seule consigne renseignée n'ajoute que sa ligne", () => {
    const block = buildLyricsGuidanceBlock({ occasion: "Anniversaire", style: "Rap" }, { style: "STYLE_ONLY" });
    expect(block).toContain("STYLE_ONLY");
    expect(block).not.toContain("Consigne de l'occasion");
  });

  it("la demande de génération transmet les deux consignes à l'IA des paroles", () => {
    const prompt = promptFor(aiLyricsTaskSchema.parse({ task: "lyrics.generate", input }), [], guidance);
    expect(prompt).toContain(guidance.occasion);
    expect(prompt).toContain(guidance.style);
  });

  it("la rallonge et la réécriture gardent aussi les consignes", () => {
    const extend = promptFor(
      aiLyricsTaskSchema.parse({ task: "lyrics.extend", input: { ...input, lyrics: "x".repeat(40) } }),
      [],
      guidance,
    );
    const rewrite = promptFor(
      aiLyricsTaskSchema.parse({
        task: "lyrics.rewrite",
        input: { ...input, lyrics: "paroles", instruction: "plus court" },
      }),
      [],
      guidance,
    );
    for (const prompt of [extend, rewrite]) {
      expect(prompt).toContain(guidance.occasion);
      expect(prompt).toContain(guidance.style);
    }
  });

  it("sans consigne, la demande ne contient aucun bloc de consignes", () => {
    const prompt = promptFor(aiLyricsTaskSchema.parse({ task: "lyrics.generate", input }));
    expect(prompt).not.toContain("Consignes d'écriture du catalogue");
  });

  it("la limite de longueur est bornée", () => {
    expect(LYRICS_GUIDANCE_MAX_LENGTH).toBeGreaterThanOrEqual(300);
    expect(LYRICS_GUIDANCE_MAX_LENGTH).toBeLessThanOrEqual(1000);
  });
});
