import "server-only";
import { createOpenAiClient } from "./provider";
import { runAnthropicLyricsTask } from "./anthropic";

export type TextGenerationProvider = {
  provider: "anthropic" | "openai";
  apiKey: string | undefined;
  model: string;
  maxOutputTokens: number;
};

/** Shared system+prompt → text call across both configured AI providers (used for lyrics, moderation, and admin text generation). */
export async function runProviderTextTask(
  provider: TextGenerationProvider,
  system: string,
  prompt: string,
): Promise<{ id: string; text: string; model: string }> {
  if (!provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  if (provider.provider === "anthropic") {
    return runAnthropicLyricsTask(provider.apiKey, provider.model, provider.maxOutputTokens, system, prompt);
  }
  const response = await createOpenAiClient(provider.apiKey).responses.create({
    model: provider.model,
    instructions: system,
    input: prompt,
    max_output_tokens: provider.maxOutputTokens,
  });
  const text = response.output_text.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { id: response.id, text, model: provider.model };
}
