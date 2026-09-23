import "server-only";
import type { MusicStyleDescriptionRequest } from "@/lib/validation/ai";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";

const SYSTEM_INSTRUCTIONS =
  "Tu es l'assistant éditorial de MusikPro, un SaaS qui génère des chansons personnalisées. Retourne uniquement le texte final demandé, sans commentaire, sans guillemets et sans balise Markdown.";

/** Mirrors the DB/Zod limits (musicStyleFormSchema in app/admin/music-styles/actions.ts) — the model is asked to stay under this, and the result is still clamped server-side below since an LLM can't be trusted to respect an exact character count. */
const MAX_LENGTH: Record<MusicStyleDescriptionRequest["kind"], number> = { client: 240, ai: 600 };

function clampToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastBreak = Math.max(truncated.lastIndexOf(" "), truncated.lastIndexOf("\n"));
  return (lastBreak > maxLength * 0.6 ? truncated.slice(0, lastBreak) : truncated).trim();
}

const CLIENT_MAX_WORDS = 5;

/** Hard guarantee that survives an LLM ignoring the word-count instruction in the prompt (observed in practice). */
function clampToWordCount(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words
    .slice(0, maxWords)
    .join(" ")
    .replace(/[,;.]+$/, "");
}

function promptFor(input: MusicStyleDescriptionRequest) {
  const reference = input.otherDescription
    ? ` Pour référence, voici l'autre description déjà rédigée pour ce style : "${input.otherDescription}".`
    : "";
  if (input.kind === "client") {
    return (
      `Style musical : "${input.styleName}".${reference}\n` +
      "Rédige une description composée d'EXACTEMENT 5 mots AU TOTAL (ni plus, ni moins en comptant chaque mot un par un, pas 5 groupes de mots), sous forme de mots simples séparés par des virgules, destinée aux clients qui choisissent ce style sur l'écran de création d'une chanson. " +
      "Si ce style est rattaché à une origine locale ou régionale reconnaissable (un pays, une région ou un continent), utilise un seul mot pour exprimer cette origine (ex. « ivoirienne » ou « africain »), pas un groupe de deux mots. Si le style est international/générique sans origine locale marquée, n'invente pas d'origine. " +
      `Exemple correct avec origine, 5 mots au total : "Ivoirienne, festive, sociale, rythmée, engagée". Exemple correct sans origine locale, 5 mots au total : "Entraînante, moderne, élégante, rythmée, captivante". N'utilise JAMAIS de groupes de deux mots comme "musique ivoirienne" ou "rythmes syncopés" : chaque mot séparé par une virgule doit être un mot unique. ` +
      "Sois évocateur et donne envie, sans jargon technique. Réponds uniquement avec les 5 mots séparés par des virgules, sans phrase complète."
    );
  }
  return (
    `Style musical : "${input.styleName}".${reference}\n` +
    "Rédige une description technique et précise (2 à 4 phrases, 500 caractères maximum) destinée à guider une IA de génération musicale afin qu'elle respecte fidèlement les codes authentiques de ce style : rythme, instrumentation typique, structure, tempo approximatif, caractéristiques vocales. " +
    "Si ce style est rattaché à une origine locale ou régionale reconnaissable (un pays, une région ou un continent), précise explicitement cette origine (par exemple « musique ivoirienne » ou « rythme africain ») afin que l'IA génératrice de musique respecte l'authenticité culturelle du style. Si le style est international/générique sans origine locale marquée, n'invente pas d'origine. " +
    "Sois concret et spécifique, évite les généralités."
  );
}

export async function generateMusicStyleDescription(input: MusicStyleDescriptionRequest, actorId?: string) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

  const raw = await runProviderTextTask(provider, SYSTEM_INSTRUCTIONS, promptFor(input));
  const lengthClamped = clampToLength(raw.text, MAX_LENGTH[input.kind]);
  const text = input.kind === "client" ? clampToWordCount(lengthClamped, CLIENT_MAX_WORDS) : lengthClamped;

  const verdict = await moderateText(text, `Description de style musical (${input.kind}) pour "${input.styleName}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.music_style_description.blocked",
      actorId,
      metadata: { styleName: input.styleName, kind: input.kind, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return { ...raw, text };
}
