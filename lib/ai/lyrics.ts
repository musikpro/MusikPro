import "server-only";
import type { AiLyricsTask } from "@/lib/validation/ai";
import { createOpenAiClient, getOpenAiProvider } from "./provider";

function promptFor(task: AiLyricsTask) {
  const input = task.input;
  const context = [
    `Occasion: ${input.occasion}`,
    `Histoire racontée par l'utilisateur: ${input.story}`,
    `Destinataire: ${input.recipientName || "non précisé"}`,
    `Relation avec le destinataire: ${input.recipientRelation || "non précisée"}`,
    `Prononciation utile: ${input.recipientPronunciation || "aucune"}`,
    `Style musical: ${input.genre}`,
    `Ambiance: ${input.mood || "libre"}`,
    `Langue: ${input.language}`,
    `Voix du chanteur: ${input.voice}`,
    `Détails supplémentaires: ${input.additionalDetails || "aucun"}`,
  ].join("\n");
  if (task.task === "lyrics.extend") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nRallonge ces paroles avec des sections cohérentes, sans répéter inutilement le texte existant.`;
  }
  if (task.task === "lyrics.rewrite") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nConsigne de révision: ${task.input.instruction}`;
  }
  return `${context}\n\nÉcris des paroles originales, chantables et structurées (couplets, refrain et pont si pertinent).`;
}

export async function runLyricsTask(task: AiLyricsTask) {
  const provider = await getOpenAiProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const isRewrite = task.task !== "lyrics.generate";
  if (
    provider.config &&
    (isRewrite ? !provider.config.lyricsRewriteEnabled : !provider.config.lyricsGenerationEnabled)
  ) {
    throw new Error("AI_CAPABILITY_DISABLED");
  }
  const response = await createOpenAiClient(provider.apiKey).responses.create({
    model: provider.model,
    instructions:
      "Tu es le parolier de MusikPro. Respecte fidèlement toutes les informations fournies. N'invente pas de faits personnels sensibles. Retourne uniquement les paroles finales, sans commentaire ni balise Markdown.",
    input: promptFor(task),
    max_output_tokens: provider.maxOutputTokens,
  });
  const text = response.output_text.trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return { id: response.id, text, model: provider.model };
}
