import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const runProviderTextTask = vi.fn();
vi.mock("@/lib/ai/provider", () => ({
  getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "k", provider: "openai", model: "m" })),
  createOpenAiClient: vi.fn(),
}));
vi.mock("@/lib/ai/anthropic", () => ({
  runAnthropicLyricsTask: (...args: unknown[]) => runProviderTextTask(...args),
}));

describe("moderateLongText", () => {
  beforeEach(() => runProviderTextTask.mockReset());

  it("analyse tout le texte par tranches, y compris la fin au-delà de 6 000 caractères", async () => {
    vi.doMock("@/lib/ai/provider", () => ({
      getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "k", provider: "anthropic", model: "m" })),
      createOpenAiClient: vi.fn(),
    }));
    vi.resetModules();
    runProviderTextTask.mockImplementation(async (...args: unknown[]) => {
      const prompt = String(args[4] ?? "");
      return { text: JSON.stringify({ flagged: prompt.includes("CONTENU-INTERDIT"), categories: [], reason: "" }) };
    });
    const { moderateLongText } = await import("@/lib/ai/moderation");
    const text = `${"a ".repeat(4000)}CONTENU-INTERDIT${" b".repeat(500)}`;
    const verdict = await moderateLongText(text, "test");
    expect(runProviderTextTask.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(verdict.flagged).toBe(true);
  });
});

describe("route de génération", () => {
  const route = readFileSync(path.resolve(__dirname, "../app/api/songs/generate/route.ts"), "utf8");

  it("modère les paroles avant de débiter les crédits", () => {
    expect(route).toContain("moderateLongText");
    expect(route.indexOf("moderateLongText(")).toBeGreaterThan(-1);
    expect(route.indexOf("moderateLongText(")).toBeLessThan(route.indexOf("deductCredits("));
    expect(route).toContain("CONTENT_BLOCKED_LYRICS");
  });

  it("envoie à la génération musicale le texte nettoyé de sa ligne « Paroles : »", () => {
    expect(route).toContain("stripLyricsTitleLine(input.lyrics)");
    expect(route).not.toMatch(/lyrics:\s*input\.lyrics/);
  });
});
