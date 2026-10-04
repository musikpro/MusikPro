import { beforeEach, describe, expect, it, vi } from "vitest";

const runProviderTextTask = vi.hoisted(() => vi.fn());
const getLyricsProvider = vi.hoisted(() => vi.fn());
const moderateText = vi.hoisted(() => vi.fn());
const writeAuditLog = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog }));

import { generateOccasionDescription } from "@/lib/ai/catalog-ai-hint";

describe("generateOccasionDescription", () => {
  beforeEach(() => {
    getLyricsProvider.mockResolvedValue({ enabled: true, apiKey: "test-only-placeholder" });
    moderateText.mockResolvedValue({ flagged: false, categories: [] });
    runProviderTextTask.mockReset();
    writeAuditLog.mockReset();
  });

  it("returns a cleaned single sentence without quotes", async () => {
    runProviderTextTask.mockResolvedValueOnce({
      text: "  « Déclarer ses sentiments et raconter une histoire à deux. »\n",
    });
    await expect(generateOccasionDescription({ name: "Amour" })).resolves.toBe(
      "Déclarer ses sentiments et raconter une histoire à deux.",
    );
    expect(runProviderTextTask.mock.calls[0][2]).toContain("« Amour »");
  });

  it("bounds the text to the 240 characters of the field", async () => {
    runProviderTextTask.mockResolvedValueOnce({ text: "a".repeat(400) });
    const text = await generateOccasionDescription({ name: "Amour" });
    expect(text.length).toBeLessThanOrEqual(240);
  });

  it("fails clearly when no AI provider is configured", async () => {
    getLyricsProvider.mockResolvedValueOnce({ enabled: false, apiKey: "" });
    await expect(generateOccasionDescription({ name: "Amour" })).rejects.toThrow("AI_PROVIDER_NOT_CONFIGURED");
    expect(runProviderTextTask).not.toHaveBeenCalled();
  });

  it("blocks a flagged result and writes an audit log", async () => {
    runProviderTextTask.mockResolvedValueOnce({ text: "Texte problématique." });
    moderateText.mockResolvedValueOnce({ flagged: true, categories: ["hate"] });
    await expect(generateOccasionDescription({ name: "Amour" }, "admin-1")).rejects.toThrow("CONTENT_BLOCKED_RESULT");
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ai.occasion_description.blocked", actorId: "admin-1" }),
    );
  });
});
