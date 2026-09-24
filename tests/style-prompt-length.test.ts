import { describe, expect, it } from "vitest";
import { buildStylePrompt } from "@/lib/ai/style-prompt-builder";

// buildStylePrompt lives in style-prompt-builder.ts, which is pure (no "server-only"/"@/db"
// import) specifically so it can be unit-tested live — unlike resolveStylePrompt in
// lib/ai/style-prompt.ts, which wraps it with the catalog lookup and stays a static
// source-regression test (see tests/song-production-directives.test.ts).
describe("buildStylePrompt — Musicful 1,000-character style limit", () => {
  it("never exceeds Musicful's documented 1,000-character style limit, even with a long AI-generated description", () => {
    // Reproduces the production incident: a catalog aiDescription long enough that the old,
    // unbounded implementation produced a 1,125-character style string, which Musicful rejected
    // on every single request with a generic "Invalid request parameter" error.
    const longDescription =
      "L'amapiano est un style sud-africain caractérisé par un tempo entre 90 et 110 BPM avec un groove syncopé et mélodique. L'instrumentation repose sur des pianos acoustiques ou numériques jouant des motifs répétitifs et hypnotiques, associés à des percussions électroniques subtiles, des basses profondes et des éléments de house. La structure privilégie des boucles minimalistes et des progressions harmoniques simples, souvent dans les tonalités mineures. Les voix, quand présentes, sont posées, souvent parlées ou chantonnées sur des refrains épurés, sans dramatique vocale.";
    const prompt = buildStylePrompt("Amapiano", longDescription, "Romantique", true);
    expect(prompt.length).toBeLessThanOrEqual(1000);
  });

  it("keeps the production directives (fade-out + variant diversity) intact even when the description is truncated", () => {
    const longDescription = "x".repeat(900);
    const prompt = buildStylePrompt("Amapiano", longDescription, "Romantique", true);
    expect(prompt).toContain("Termine la chanson par un outro naturel");
    expect(prompt).toContain("nettement distincts");
  });

  it("leaves short, real-world prompts untouched", () => {
    const description =
      "Générez un Zouglou avec un tempo entre 110 et 130 BPM, fondé sur des rythmes syncopés et des motifs de percussion hypnotiques.";
    const prompt = buildStylePrompt("Zouglou", description, "Énergique", true);
    expect(prompt.startsWith("Zouglou (Générez un Zouglou")).toBe(true);
    expect(prompt.length).toBeLessThanOrEqual(1000);
  });

  it("falls back to the bare genre name when no catalog description exists", () => {
    const prompt = buildStylePrompt("Zouglou", null, "Romantique", true);
    expect(prompt.startsWith("Zouglou — Ambiance : Romantique")).toBe(true);
  });
});
