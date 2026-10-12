import "server-only";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { LYRICS_GUIDANCE_MAX_LENGTH } from "./lyrics-guidance";
import { writeAuditLog } from "@/lib/security/audit";

const SYSTEM_INSTRUCTIONS =
  "Tu es l'assistant éditorial de MusikPro, un SaaS qui génère des chansons personnalisées. Retourne uniquement le texte final demandé, sans commentaire, sans guillemets et sans balise Markdown.";

export type LyricsGuidanceKind = "occasion" | "style";

/** Cible demandée au modèle : sous la limite, car il dépasse souvent le nombre de caractères annoncé. */
const TARGET_MAX = LYRICS_GUIDANCE_MAX_LENGTH - 120;

function clamp(text: string): string {
  const clean = text
    .replace(/[ \t]+/g, " ")
    .replace(/^["«\s]+|["»\s]+$/g, "")
    .trim();
  if (clean.length <= LYRICS_GUIDANCE_MAX_LENGTH) return clean;
  const head = clean.slice(0, LYRICS_GUIDANCE_MAX_LENGTH);
  const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("."));
  return (lastStop > LYRICS_GUIDANCE_MAX_LENGTH * 0.6 ? head.slice(0, lastStop + 1) : head).trim();
}

/**
 * La langue des paroles est choisie par le client dans le parcours de création : une consigne du catalogue ne doit
 * jamais la fixer. Cette règle est ajoutée aux deux prompts de génération.
 */
const LANGUAGE_NEUTRAL_RULE =
  "RÈGLE ABSOLUE : ne désigne JAMAIS la langue des paroles (n'écris pas « en français », « en anglais », etc.) : le client choisit sa langue dans le parcours de création, et la consigne doit fonctionner pour toutes les langues. " +
  "Formule tout en termes valables quelle que soit la langue. Pour une expression, un argot ou un marqueur linguistique propre au style, n'en parle que sous la forme « si la langue choisie s'y prête ». ";

export function lyricsGuidancePrompt(kind: LyricsGuidanceKind, name: string, description: string) {
  const context = description ? ` Description : « ${description} ».` : "";
  if (kind === "occasion")
    return (
      `Occasion d'une chanson personnalisée : « ${name} ».${context}\n` +
      "Rédige EN FRANÇAIS une consigne destinée à une IA qui écrit les PAROLES de cette chanson. Elle règle le FOND et le TON : registre émotionnel, thèmes et moments à évoquer, ce qu'il faut absolument mettre dans le texte, et ce qu'il faut éviter. " +
      "Public : clients du monde entier, notamment d'Afrique et de la diaspora. Ne parle ni de musique ni de rythme (un autre champ s'en charge). " +
      LANGUAGE_NEUTRAL_RULE +
      `Un seul paragraphe de 2 à 4 phrases à l'impératif, ${TARGET_MAX} caractères maximum, sans émoji ni puce. Réponds uniquement avec la consigne.`
    );
  return (
    `Style musical : « ${name} ».${context}\n` +
    "Rédige EN FRANÇAIS une consigne destinée à une IA qui écrit les PAROLES d'une chanson dans ce style. Elle règle la FORME du texte : flow, longueur et rythme des phrases, métrique, rimes, structure (couplets, refrain, pont), vocabulaire, expressions et interjections typiques du style. " +
    "Ne décris ni les instruments ni le tempo (un autre champ s'en charge) et ne parle pas du thème de la chanson. " +
    LANGUAGE_NEUTRAL_RULE +
    `Un seul paragraphe de 2 à 4 phrases à l'impératif, ${TARGET_MAX} caractères maximum, sans émoji ni puce. Réponds uniquement avec la consigne.`
  );
}

const LANGUAGES = "français|anglais|espagnol|portugais|allemand|italien|arabe|wolof|dioula|bambara|lingala|swahili";

/**
 * Filet de sécurité : si le modèle impose quand même une langue (« Écris les paroles en français avec… »), on retire la
 * formule de langue de la consigne — elle fixerait la langue pour tous les clients alors qu'ils la choisissent eux-mêmes.
 */
export function stripLanguageDirective(text: string): string {
  const directive = new RegExp(
    `(^|[.!?]\\s+)((?:écris|rédige|compose|écrire|rédiger)\\s+(?:les\\s+|des\\s+|tes\\s+)?(?:paroles|textes?|couplets))\\s+(?:en|dans)\\s+(?:le\\s+|la\\s+)?(?:${LANGUAGES})\\b`,
    "gi",
  );
  return text
    .replace(directive, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Propose la consigne d'écriture des paroles d'une occasion (fond/ton) ou d'un style (forme) ; rien n'est enregistré ici. */
export async function generateLyricsGuidance(
  input: { kind: LyricsGuidanceKind; name: string; description?: string },
  actorId?: string,
) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const raw = await runProviderTextTask(
    provider,
    SYSTEM_INSTRUCTIONS,
    lyricsGuidancePrompt(input.kind, input.name, input.description ?? ""),
  );
  const text = clamp(stripLanguageDirective(raw.text));
  if (!text) throw new Error("AI_BAD_FORMAT");
  const verdict = await moderateText(text, `Consigne paroles (${input.kind}) pour "${input.name}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.lyrics_guidance.blocked",
      actorId,
      metadata: { kind: input.kind, name: input.name, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return text;
}
