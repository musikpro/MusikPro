import Anthropic from "@anthropic-ai/sdk";
import type { AiLyricsTask } from "@/lib/validation/ai";

export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey, timeout: 110_000, maxRetries: 1 });
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

/**
 * Texte final d'une réponse qui a pu passer par la recherche web : le modèle écrit parfois « Je vais chercher… » avant
 * l'appel à l'outil ; seul le texte placé APRÈS le dernier résultat de recherche est la réponse. Sans recherche, tous
 * les blocs de texte sont conservés (comportement historique).
 */
export function finalTextAfterSearch(blocks: Array<{ type: string; text?: string }>): {
  text: string;
  searched: boolean;
} {
  let text = "";
  let searched = false;
  for (const block of blocks) {
    if (block.type === "web_search_tool_result") {
      searched = true;
      text = "";
    } else if (block.type === "text" && typeof block.text === "string") {
      text = text ? `${text}\n${block.text}` : block.text;
    }
  }
  return { text: text.trim(), searched };
}

const MAX_SEARCH_CONTINUATIONS = 3;

/**
 * Même appel que `runAnthropicLyricsTask`, avec l'outil de recherche web d'Anthropic (3 recherches au plus). Le
 * premier tour impose l'outil (`any`) pour que la recherche ait réellement lieu ; si la réponse est suspendue
 * (`pause_turn`), la conversation est reprise telle quelle, au plus 3 fois.
 */
export async function runAnthropicWebSearchTask(
  apiKey: string,
  model: string,
  maxTokens: number,
  system: string,
  prompt: string,
) {
  const client = createAnthropicClient(apiKey);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const tools: Anthropic.ToolUnion[] = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
  let searched = false;
  for (let turn = 0; turn <= MAX_SEARCH_CONTINUATIONS; turn += 1) {
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools,
      tool_choice: turn === 0 ? { type: "any" } : { type: "auto" },
    });
    const result = finalTextAfterSearch(message.content);
    searched = searched || result.searched;
    if (message.stop_reason !== "pause_turn") {
      if (!result.text) throw new Error("AI_EMPTY_RESPONSE");
      return { id: message.id, text: result.text, model: message.model, searched };
    }
    messages.push({ role: "assistant", content: message.content });
  }
  throw new Error("AI_EMPTY_RESPONSE");
}

export type { AiLyricsTask };
