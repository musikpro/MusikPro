import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const runProviderTextTask = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "k", provider: "openai", model: "m" })),
}));
vi.mock("@/lib/ai/text-generation", () => ({
  runProviderTextTask: (...args: unknown[]) => runProviderTextTask(...args),
}));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn(async () => ({ flagged: false, categories: [] })) }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { buildLyricsGuidanceBlock } from "@/lib/ai/lyrics-guidance";
import { generateLyricsGuidance, lyricsGuidancePrompt, stripLanguageDirective } from "@/lib/ai/lyrics-guidance-suggest";

describe("consigne des paroles : la langue appartient au client", () => {
  beforeEach(() => runProviderTextTask.mockReset());

  it.each(["style", "occasion"] as const)("le prompt de génération (%s) interdit de fixer la langue", (kind) => {
    const prompt = lyricsGuidancePrompt(kind, "Griot / Kora Music", "");
    expect(prompt).toContain("ne désigne JAMAIS la langue des paroles");
    expect(prompt).toContain("le client choisit sa langue");
    expect(prompt).not.toMatch(/langue ou argot/);
    expect(prompt).not.toMatch(/francophones d'Afrique/);
  });

  it("retire la formule « Écris les paroles en français » sans toucher au reste", () => {
    expect(stripLanguageDirective("Écris les paroles en français avec un flow narratif. Refrain court.")).toBe(
      "Écris les paroles avec un flow narratif. Refrain court.",
    );
    expect(stripLanguageDirective("Rédige des paroles en anglais avec un refrain scandé.")).toBe(
      "Rédige des paroles avec un refrain scandé.",
    );
  });

  it("laisse intacts les textes sans directive de langue", () => {
    const text = "Alterne couplets denses et refrain répétitif, avec des interjections typiques.";
    expect(stripLanguageDirective(text)).toBe(text);
    const mention = "Glisse des expressions en français quand la langue choisie s'y prête.";
    expect(stripLanguageDirective(mention)).toBe(mention);
  });

  it("la consigne générée n'impose plus de langue même si le modèle l'écrit", async () => {
    runProviderTextTask.mockResolvedValue({
      text: "Écris les paroles en français avec un flow narratif et méditatif.",
    });
    const text = await generateLyricsGuidance({ kind: "style", name: "Griot / Kora Music" });
    expect(text).toBe("Écris les paroles avec un flow narratif et méditatif.");
  });

  it("le prompt des paroles fait primer la langue choisie sur toute consigne enregistrée", () => {
    const block = buildLyricsGuidanceBlock(
      { occasion: "Anniversaire", style: "Griot" },
      { style: "Écris les paroles en français avec un flow narratif." },
    );
    expect(block).toContain("TOUJOURS celle du champ « Langue »");
    expect(block).toContain("prime sur toute mention de langue");
  });
});
