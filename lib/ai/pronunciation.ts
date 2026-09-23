import "server-only";
import { createOpenAiClient, getLyricsProvider } from "./provider";
import { runAnthropicLyricsTask } from "./anthropic";

const MAX_PRONUNCIATION_LENGTH = 200;
const MAX_OUTPUT_TOKENS = 60;

function clampPronunciation(text: string) {
  const cleaned = text.trim().replace(/\s+/g, " ").replace(/^["'«]+|["'»]+$/g, "");
  return cleaned.length > MAX_PRONUNCIATION_LENGTH ? cleaned.slice(0, MAX_PRONUNCIATION_LENGTH) : cleaned;
}

const INSTRUCTIONS =
  "Tu aides MusikPro à transcrire phonétiquement un prénom ou un nom pour qu'un moteur de génération vocale le chante correctement, notamment pour les prénoms africains et locaux. Réponds uniquement avec la transcription phonétique simplifiée, syllabes séparées par des tirets, sans explication, sans guillemets, sans ponctuation superflue.";

/**
 * Deliberately reuses the same AI provider already configured for lyrics (`getLyricsProvider`)
 * instead of introducing a second, separately-keyed provider — this capability has no settings
 * of its own by design.
 */
export async function suggestPronunciation(name: string, language: string) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const prompt = `Prénom ou nom: ${name}\nLangue ou contexte: ${language || "non précisée"}\n\nDonne la prononciation phonétique simplifiée de ce nom, syllabes séparées par des tirets (exemple: Aïcha -> Aï-cha).`;
  if (provider.provider === "anthropic") {
    const result = await runAnthropicLyricsTask(provider.apiKey, provider.model, MAX_OUTPUT_TOKENS, INSTRUCTIONS, prompt);
    return { pronunciation: clampPronunciation(result.text), model: provider.model, provider: "anthropic" as const };
  }
  const response = await createOpenAiClient(provider.apiKey).responses.create({
    model: provider.model,
    instructions: INSTRUCTIONS,
    input: prompt,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });
  const text = response.output_text.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { pronunciation: clampPronunciation(text), model: provider.model, provider: "openai" as const };
}
