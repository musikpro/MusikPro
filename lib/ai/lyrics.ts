import "server-only";
import type { AiLyricsTask } from "@/lib/validation/ai";
import { createOpenAiClient, getLyricsProvider } from "./provider";
import { runAnthropicLyricsTask } from "./anthropic";
import { enforceLyricsWordLimit, LYRICS_MAX_WORDS } from "./lyrics-policy";

export function promptFor(task: AiLyricsTask) {
  const input = task.input;
  const context = [
    `Occasion: ${input.occasion}`,
    `Histoire racontée par l'utilisateur: ${input.story}`,
    `Destinataire: ${input.recipientName || "non précisé"}`,
    `Relation avec le destinataire: ${input.recipientRelation || "non précisée"}`,
    `Prononciation exacte du nom à utiliser dans les passages chantés: ${input.recipientPronunciation || "aucune"}`,
    `Style musical: ${input.genre}`,
    `Ambiance: ${input.mood || "libre"}`,
    `Langue: ${input.language}`,
    `Voix du chanteur: ${input.voice}`,
    `Détails supplémentaires: ${input.additionalDetails || "aucun"}`,
  ].join("\n");
  if (task.task === "lyrics.extend") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nRallonge ces paroles avec des sections cohérentes, sans répéter inutilement le texte existant. Retourne la chanson complète et reste sous ${LYRICS_MAX_WORDS} mots au total.`;
  }
  if (task.task === "lyrics.rewrite") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nConsigne de révision: ${task.input.instruction}`;
  }
  return `${context}\n\nÉcris des paroles originales, chantables et structurées (couplets, refrain et pont si pertinent), sous ${LYRICS_MAX_WORDS} mots. Toutes les informations ci-dessus sont obligatoires: adapte clairement le texte à l'occasion, à l'histoire, au destinataire et à sa relation avec l'utilisateur, au style, à l'ambiance, à la langue, à la voix et au souvenir. Chaque fois que le nom du destinataire est chanté, écris sa prononciation exacte fournie ci-dessus afin que le moteur audio la respecte.`;
}

export async function runLyricsTask(task: AiLyricsTask) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const isRewrite = task.task !== "lyrics.generate";
  if (
    provider.config &&
    (isRewrite ? !provider.config.lyricsRewriteEnabled : !provider.config.lyricsGenerationEnabled)
  ) {
    throw new Error("AI_CAPABILITY_DISABLED");
  }
  const instructions =
    `Tu es le parolier de MusikPro. Respecte fidèlement chaque paramètre fourni, sans en ignorer aucun. La relation détermine le ton et le vocabulaire. La prononciation fournie détermine la forme chantée du nom. N'invente pas de faits personnels sensibles. Retourne uniquement les paroles finales, sans commentaire ni balise Markdown, avec un maximum absolu de ${LYRICS_MAX_WORDS} mots et une longueur adaptée à une chanson de 4 minutes maximum.`;
  if (provider.provider === "anthropic") {
    const result = await runAnthropicLyricsTask(
      provider.apiKey,
      provider.model,
      provider.maxOutputTokens,
      instructions,
      promptFor(task),
    );
    return { ...result, text: enforceLyricsWordLimit(result.text) };
  }
  const response = await createOpenAiClient(provider.apiKey).responses.create({
    model: provider.model,
    instructions,
    input: promptFor(task),
    max_output_tokens: provider.maxOutputTokens,
  });
  const text = response.output_text.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { id: response.id, text: enforceLyricsWordLimit(text), model: provider.model };
}
