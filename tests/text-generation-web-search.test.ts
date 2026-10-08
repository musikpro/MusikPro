import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@/lib/ai/provider-core", () => ({ createOpenAiClient: () => ({ responses: { create } }) }));
const runAnthropicWebSearchTask = vi.fn();
const runAnthropicLyricsTask = vi.fn();
vi.mock("@/lib/ai/anthropic-core", () => ({
  runAnthropicWebSearchTask: (...args: unknown[]) => runAnthropicWebSearchTask(...args),
  runAnthropicLyricsTask: (...args: unknown[]) => runAnthropicLyricsTask(...args),
}));

import { runProviderTextTask } from "@/lib/ai/text-generation-core";

const openai = { provider: "openai" as const, apiKey: "k", model: "m", maxOutputTokens: 500 };
const anthropic = { provider: "anthropic" as const, apiKey: "k", model: "m", maxOutputTokens: 500 };

describe("recherche web : OpenAI", () => {
  beforeEach(() => create.mockReset());

  it("transmet l'outil de recherche, l'impose, et signale qu'elle a eu lieu", async () => {
    create.mockResolvedValue({
      id: "r",
      output_text: "Ivorian Coupé-Décalé, 120-135 BPM.",
      output: [{ type: "web_search_call" }],
    });
    const result = await runProviderTextTask(openai, "sys", "prompt", { webSearch: true });
    const params = create.mock.calls[0][0];
    expect(params.tools).toEqual([{ type: "web_search", search_context_size: "low" }]);
    expect(params.tool_choice).toBe("required");
    expect(result.webSearch).toBe("used");
  });

  it("sans option : aucun outil, comportement historique", async () => {
    create.mockResolvedValue({ id: "r", output_text: "texte", output: [] });
    const result = await runProviderTextTask(openai, "sys", "prompt");
    expect(create.mock.calls[0][0].tools).toBeUndefined();
    expect(result.webSearch).toBe("off");
  });

  it("repli sans recherche si le fournisseur refuse l'outil (400), signalé", async () => {
    create.mockRejectedValueOnce(Object.assign(new Error("tool not supported"), { status: 400 }));
    create.mockResolvedValueOnce({ id: "r2", output_text: "texte", output: [] });
    const result = await runProviderTextTask(openai, "sys", "prompt", { webSearch: true });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].tools).toBeUndefined();
    expect(result.webSearch).toBe("unavailable");
  });

  it("ne masque pas une vraie panne (limite 429) : une seule tentative, erreur remontée", async () => {
    create.mockRejectedValueOnce(Object.assign(new Error("rate limited"), { status: 429 }));
    await expect(runProviderTextTask(openai, "sys", "prompt", { webSearch: true })).rejects.toThrow("rate limited");
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("recherche web : Anthropic", () => {
  beforeEach(() => {
    runAnthropicWebSearchTask.mockReset();
    runAnthropicLyricsTask.mockReset();
  });

  it("utilise la recherche et le signale", async () => {
    runAnthropicWebSearchTask.mockResolvedValue({ id: "a", text: "texte", model: "m", searched: true });
    const result = await runProviderTextTask(anthropic, "sys", "prompt", { webSearch: true });
    expect(result.webSearch).toBe("used");
    expect(runAnthropicLyricsTask).not.toHaveBeenCalled();
  });

  it("repli sans recherche si l'outil est refusé (403)", async () => {
    runAnthropicWebSearchTask.mockRejectedValue(Object.assign(new Error("web search disabled"), { status: 403 }));
    runAnthropicLyricsTask.mockResolvedValue({ id: "b", text: "texte", model: "m" });
    const result = await runProviderTextTask(anthropic, "sys", "prompt", { webSearch: true });
    expect(result.webSearch).toBe("unavailable");
    expect(result.text).toBe("texte");
  });
});
