import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiLyricsTask } from "@/lib/validation/ai";

export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });
}

export async function runAnthropicLyricsTask(
  apiKey: string,
  model: string,
  maxTokens: number,
  system: string,
  prompt: string,
) {
  const message = await createAnthropicClient(apiKey).messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { id: message.id, text, model: message.model };
}

export type { AiLyricsTask };
