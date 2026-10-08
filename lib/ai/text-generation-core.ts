import { createOpenAiClient } from "./provider-core";
import { runAnthropicLyricsTask, runAnthropicWebSearchTask } from "./anthropic-core";

export type TextGenerationProvider = {
  provider: "anthropic" | "openai";
  apiKey: string | undefined;
  model: string;
  maxOutputTokens: number;
};

export type TextTaskOptions = {
  /** Autorise le modèle à chercher sur Internet avant de répondre (consigne IA des styles musicaux). */
  webSearch?: boolean;
};

/** `used` : une recherche a eu lieu ; `unavailable` : demandée mais refusée par le fournisseur (réponse sans recherche) ; `off` : non demandée. */
export type WebSearchStatus = "used" | "unavailable" | "off";

/** Erreurs HTTP qui signifient « outil de recherche non autorisé ou non pris en charge » (pas une panne). */
function isSearchUnavailable(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 400 || status === 403 || status === 404 || status === 422;
}

/** Shared system+prompt → text call across both configured AI providers (used for lyrics, moderation, and admin text generation). */
export async function runProviderTextTask(
  provider: TextGenerationProvider,
  system: string,
  prompt: string,
  options: TextTaskOptions = {},
): Promise<{ id: string; text: string; model: string; webSearch: WebSearchStatus }> {
  if (!provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const wantsSearch = options.webSearch === true;
  if (provider.provider === "anthropic") {
    if (wantsSearch) {
      try {
        const result = await runAnthropicWebSearchTask(
          provider.apiKey,
          provider.model,
          provider.maxOutputTokens,
          system,
          prompt,
        );
        return {
          id: result.id,
          text: result.text,
          model: result.model,
          webSearch: result.searched ? "used" : "unavailable",
        };
      } catch (error) {
        if (!isSearchUnavailable(error)) throw error;
      }
    }
    const result = await runAnthropicLyricsTask(
      provider.apiKey,
      provider.model,
      provider.maxOutputTokens,
      system,
      prompt,
    );
    return { ...result, webSearch: wantsSearch ? "unavailable" : "off" };
  }
  const client = createOpenAiClient(provider.apiKey);
  if (wantsSearch) {
    try {
      const response = await client.responses.create({
        model: provider.model,
        instructions: system,
        input: prompt,
        max_output_tokens: provider.maxOutputTokens,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "required",
      });
      const text = response.output_text.trim();
      if (!text) throw new Error("AI_EMPTY_RESPONSE");
      const searched = response.output.some((item) => item.type === "web_search_call");
      return { id: response.id, text, model: provider.model, webSearch: searched ? "used" : "unavailable" };
    } catch (error) {
      if (!isSearchUnavailable(error)) throw error;
    }
  }
  const response = await client.responses.create({
    model: provider.model,
    instructions: system,
    input: prompt,
    max_output_tokens: provider.maxOutputTokens,
  });
  const text = response.output_text.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { id: response.id, text, model: provider.model, webSearch: wantsSearch ? "unavailable" : "off" };
}
