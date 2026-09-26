import { describe, expect, it, vi } from "vitest";

const runProviderTextTask = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/provider-core", () => ({
  getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "test-only-placeholder" })),
}));
vi.mock("@/lib/ai/text-generation-core", () => ({ runProviderTextTask }));

import { translateBatch } from "@/lib/i18n/ai-translate";

describe("translateBatch", () => {
  it("recovers a single-string batch when the provider echoes a bare value instead of { key: value }", async () => {
    runProviderTextTask.mockResolvedValueOnce({
      text: '```json\n{\n  "Chansons générées par más de 308 000 personas"\n}\n```',
    });
    const result = await translateBatch("es", ["Chansons générées par plus de 308 000 personnes"]);
    expect(result).toEqual({
      "Chansons générées par plus de 308 000 personnes": "Chansons générées par más de 308 000 personas",
    });
  });

  it("still rejects a genuinely invalid response", async () => {
    runProviderTextTask.mockResolvedValueOnce({ text: "not json at all" });
    await expect(translateBatch("es", ["Un", "Deux"])).rejects.toThrow("AI translation response was not valid JSON");
  });

  it("does not apply the single-string recovery to a multi-string batch", async () => {
    runProviderTextTask.mockResolvedValueOnce({ text: '{\n  "juste une valeur"\n}' });
    await expect(translateBatch("es", ["Un", "Deux"])).rejects.toThrow("AI translation response was not valid JSON");
  });
});
