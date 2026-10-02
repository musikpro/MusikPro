import "server-only";
import type { AiLyricsTask } from "@/lib/validation/ai";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import {
  enforceLyricsWordLimit,
  LYRICS_MAX_WORDS,
  stripLyricsMarkdown,
  UNKNOWN_WORDS_PRONUNCIATION_RULE,
} from "./lyrics-policy";
import { formatAnswersForPrompt } from "@/lib/occasion-fields/answers";
import type { ResolvedAnswer } from "@/lib/occasion-fields/types";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";

export function promptFor(task: AiLyricsTask, details: ResolvedAnswer[] = []) {
  const input = task.input;
  const personalised = formatAnswersForPrompt(details);
  const context = [
    `Occasion: ${input.occasion}`,
    `Histoire racontée par l'utilisateur: ${input.story}`,
    `Destinataire: ${input.recipientName || "non précisé"}`,
    `Relation avec le destinataire: ${input.recipientRelation || "non précisée"}`,
    `Prononciation exacte du nom à utiliser dans les passages chantés: ${input.recipientPronunciation || "aucune"}`,
    `De la part de: ${input.senderName || "non précisé"}`,
    `Prononciation exacte du nom de l'expéditeur à utiliser dans les passages chantés: ${input.senderPronunciation || "aucune"}`,
    `Style musical: ${input.genre}`,
    `Ambiance: ${input.mood || "libre"}`,
    `Langue: ${input.language}`,
    `Voix du chanteur: ${input.voice}`,
    `Détails supplémentaires: ${input.additionalDetails || "aucun"}`,
    ...(personalised ? [personalised] : []),
  ].join("\n");
  if (task.task === "lyrics.extend") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nRallonge ces paroles avec des sections cohérentes, sans répéter inutilement le texte existant, et termine par un court outro qui referme la chanson en douceur (par exemple une reprise atténuée du refrain ou une dernière phrase conclusive) plutôt qu'une fin abrupte. Retourne la chanson complète et reste sous ${LYRICS_MAX_WORDS} mots au total.\n\n${UNKNOWN_WORDS_PRONUNCIATION_RULE}`;
  }
  if (task.task === "lyrics.rewrite") {
    return `${context}\n\nParoles actuelles:\n${task.input.lyrics}\n\nConsigne de révision: ${task.input.instruction}\n\n${UNKNOWN_WORDS_PRONUNCIATION_RULE}`;
  }
  return `${context}\n\nÉcris des paroles originales, chantables et structurées (couplets, refrain, pont si pertinent, et un court outro final qui referme la chanson en douceur — par exemple une reprise atténuée du refrain ou une dernière phrase conclusive — plutôt qu'une fin abrupte), sous ${LYRICS_MAX_WORDS} mots. Toutes les informations ci-dessus sont obligatoires: adapte clairement le texte à l'occasion, à l'histoire, au destinataire et à sa relation avec l'utilisateur, à l'expéditeur, au style, à l'ambiance, à la langue, à la voix et au souvenir, et utilise les informations personnalisées éventuelles en suivant leur consigne. Chaque fois que le nom du destinataire ou celui de l'expéditeur est chanté, écris sa prononciation exacte fournie ci-dessus afin que le moteur audio la respecte.\n\n${UNKNOWN_WORDS_PRONUNCIATION_RULE}`;
}

export async function runLyricsTask(task: AiLyricsTask, actorId?: string, details: ResolvedAnswer[] = []) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const isRewrite = task.task !== "lyrics.generate";
  if (
    provider.config &&
    (isRewrite ? !provider.config.lyricsRewriteEnabled : !provider.config.lyricsGenerationEnabled)
  ) {
    throw new Error("AI_CAPABILITY_DISABLED");
  }

  const requestText = [task.input.story, task.input.additionalDetails, task.input.recipientName, task.input.senderName,
    ...details.map((answer) => answer.value),
  ]
    .filter(Boolean)
    .join("\n");
  const requestVerdict = await moderateText(
    requestText,
    "Demande utilisateur (histoire, détails, destinataire) pour une chanson",
  );
  if (requestVerdict.flagged) {
    await writeAuditLog({
      action: "ai.content.blocked_request",
      actorId,
      metadata: { categories: requestVerdict.categories, reason: requestVerdict.reason },
    });
    throw new Error("CONTENT_BLOCKED_REQUEST");
  }

  const instructions = `Tu es le parolier de MusikPro. Respecte fidèlement chaque paramètre fourni, sans en ignorer aucun. La relation détermine le ton et le vocabulaire. La prononciation fournie détermine la forme chantée du nom. ${UNKNOWN_WORDS_PRONUNCIATION_RULE} N'invente pas de faits personnels sensibles. Retourne uniquement les paroles finales, sans commentaire ni balise Markdown, avec un maximum absolu de ${LYRICS_MAX_WORDS} mots et une longueur adaptée à une chanson de 4 minutes maximum.`;
  const raw = await runProviderTextTask(provider, instructions, promptFor(task, details));
  const result = { ...raw, text: enforceLyricsWordLimit(stripLyricsMarkdown(raw.text)) };

  const resultVerdict = await moderateText(result.text, "Paroles de chanson générées");
  if (resultVerdict.flagged) {
    await writeAuditLog({
      action: "ai.content.blocked_result",
      actorId,
      metadata: { categories: resultVerdict.categories, reason: resultVerdict.reason },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return result;
}
