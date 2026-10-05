import "server-only";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";
import { MOOD_AI_HINT_MAX_LENGTH } from "@/lib/moods/catalog";
import {
  OCCASION_STORY_FIELDS,
  OCCASION_STORY_MAX_LENGTHS,
  type OccasionStoryCopy,
  type OccasionStoryField,
} from "@/lib/occasions/catalog";

const SYSTEM_INSTRUCTIONS =
  "Tu es l'assistant éditorial de MusikPro, un SaaS qui génère des chansons personnalisées. Retourne uniquement le texte final demandé, sans commentaire, sans guillemets et sans balise Markdown.";

function clamp(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").replace(/^["'«\s]+|["'»\s.]+$/g, "");
  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastComma = truncated.lastIndexOf(",");
  return (lastComma > maxLength * 0.5 ? truncated.slice(0, lastComma) : truncated).trim();
}

/**
 * Propose la « consigne IA » d'une ambiance : quelques mots anglais (Musicful comprend mieux l'anglais) qui
 * précisent l'ambiance dans le champ `style`. Le résultat est borné côté serveur car un LLM ne respecte pas un
 * nombre exact de caractères.
 */
export async function generateMoodAiHint(input: { name: string; description?: string }, actorId?: string) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const context = input.description ? ` Description pour le client : « ${input.description} ».` : "";
  const raw = await runProviderTextTask(
    provider,
    SYSTEM_INSTRUCTIONS,
    `Ambiance musicale : « ${input.name} ».${context}\n` +
      "Rédige EN ANGLAIS une consigne très courte destinée à une IA de génération musicale (Musicful), sous forme de 3 à 5 mots-clés très courts séparés par des virgules : adjectifs d'ambiance puis une ou deux qualités musicales (tempo, instruments, intensité). " +
      `${MOOD_AI_HINT_MAX_LENGTH} caractères maximum. Exemple pour « Nostalgique » : nostalgic, warm, bittersweet, soft piano and strings, slow tempo. Réponds uniquement avec les mots-clés.`,
  );
  const text = clamp(raw.text, MOOD_AI_HINT_MAX_LENGTH);
  const verdict = await moderateText(text, `Consigne IA d'ambiance musicale pour "${input.name}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.mood_hint.blocked",
      actorId,
      metadata: { name: input.name, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return text;
}

/** Même principe que pour les ambiances, appliqué à une occasion (nom + description saisis par le propriétaire). */
export async function generateOccasionAiHint(input: { name: string; description?: string }, actorId?: string) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const context = input.description ? ` Description : « ${input.description} ».` : "";
  const raw = await runProviderTextTask(
    provider,
    SYSTEM_INSTRUCTIONS,
    `Occasion d'une chanson personnalisée : « ${input.name} ».${context}\n` +
      "Rédige EN ANGLAIS une consigne très courte destinée à une IA de génération musicale (Musicful) pour qu'elle compose une chanson adaptée à cette occasion, sous forme de 3 à 5 mots-clés très courts séparés par des virgules : la nature de l'occasion, puis l'émotion et le ton recherchés. " +
      `${MOOD_AI_HINT_MAX_LENGTH} caractères maximum. Exemple pour « Anniversaire » : birthday celebration, joyful, warm, heartfelt tribute. Réponds uniquement avec les mots-clés.`,
  );
  const text = clamp(raw.text, MOOD_AI_HINT_MAX_LENGTH);
  const verdict = await moderateText(text, `Consigne IA d'occasion musicale pour "${input.name}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.occasion_hint.blocked",
      actorId,
      metadata: { name: input.name, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return text;
}

const OCCASION_DESCRIPTION_MAX_LENGTH = 240;

/**
 * Propose la description d'une occasion (texte français montré au client) d'après son seul nom. Une phrase courte,
 * bornée côté serveur (240 caractères, comme le champ) ; le texte reste modifiable avant l'enregistrement.
 */
export async function generateOccasionDescription(input: { name: string }, actorId?: string) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const raw = await runProviderTextTask(
    provider,
    SYSTEM_INSTRUCTIONS,
    `Occasion d'une chanson personnalisée : « ${input.name} ».\n` +
      "Rédige EN FRANÇAIS une description très courte (une seule phrase, 12 mots environ) qui explique au client quand cette occasion est proposée, avec un verbe à l'infinitif en début de phrase. " +
      `${OCCASION_DESCRIPTION_MAX_LENGTH} caractères maximum, sans émoji. Exemple pour « Amour » : Déclarer ses sentiments et raconter une histoire à deux. Réponds uniquement avec la phrase.`,
  );
  const clean = raw.text.replace(/\s+/g, " ").replace(/^["'«\s]+|["'»\s]+$/g, "");
  const text =
    clean.length <= OCCASION_DESCRIPTION_MAX_LENGTH ? clean : clean.slice(0, OCCASION_DESCRIPTION_MAX_LENGTH).trim();
  const verdict = await moderateText(text, `Description d'occasion musicale pour "${input.name}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.occasion_description.blocked",
      actorId,
      metadata: { name: input.name, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return text;
}

/**
 * Propose les textes de l'étape « Raconte ton histoire » d'une occasion (titre, sous-titre, libellé du champ,
 * exemple dans le champ, astuce), en français et à la deuxième personne du singulier comme le reste du parcours.
 * Un seul appel ; chaque texte est borné côté serveur et le tout est modéré. Rien n'est enregistré ici.
 */
/** Coupe au dernier mot entier sous la limite (dernier recours si l'IA dépasse), sans ponctuation finale orpheline. */
function clampAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/u, "");
}

export async function generateOccasionStoryCopy(
  input: { name: string; description?: string },
  actorId?: string,
): Promise<OccasionStoryCopy> {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const context = input.description ? ` Description : « ${input.description} ».` : "";
  const raw = await runProviderTextTask(
    provider,
    SYSTEM_INSTRUCTIONS,
    `Occasion d'une chanson personnalisée : « ${input.name} ».${context}\n` +
      "Public : francophones d'Afrique et de la diaspora ; exemples ancrés dans leur quotidien (famille, amis, église ou mosquée, quartier), jamais de lieu étranger célèbre. Rédige EN FRANÇAIS, en tutoyant le client, les textes de l'écran où il décrit ce qu'il veut dans sa chanson. Ils doivent parler de CETTE occasion (jamais d'un texte générique du type « Raconte ton histoire »). " +
      "Réponds uniquement avec un objet JSON de cinq clés : " +
      `storyTitle (titre de l'écran, ${Math.round(OCCASION_STORY_MAX_LENGTHS.storyTitle * 0.7)} caractères max), ` +
      `storySubtitle (sous-titre, ${Math.round(OCCASION_STORY_MAX_LENGTHS.storySubtitle * 0.7)} max), ` +
      `storyLabel (libellé du champ de saisie, ${Math.round(OCCASION_STORY_MAX_LENGTHS.storyLabel * 0.7)} max), ` +
      `storyPlaceholder (exemple concret commençant par « Ex. : », écrit à la première personne, ${Math.round(OCCASION_STORY_MAX_LENGTHS.storyPlaceholder * 0.7)} max), ` +
      `storyTip (astuce commençant par un verbe, qui dit quels détails donner, ${Math.round(OCCASION_STORY_MAX_LENGTHS.storyTip * 0.7)} max). ` +
      "Chaque texte est UNE phrase complète qui respecte strictement sa limite (jamais coupée). Pas d'émoji, pas de balise Markdown.",
  );
  const match = raw.text.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = match ? (JSON.parse(match[0]) as Record<string, unknown>) : {};
  } catch {
    throw new Error("AI_INVALID_STORY_COPY");
  }
  const copy = {} as OccasionStoryCopy;
  for (const field of OCCASION_STORY_FIELDS) {
    const value = parsed[field];
    if (typeof value !== "string" || !value.trim()) throw new Error("AI_INVALID_STORY_COPY");
    copy[field as OccasionStoryField] = value
      .replace(/\s+/g, " ")
      .replace(/^["«\s]+|["»\s]+$/g, "")
      .trim();
    copy[field as OccasionStoryField] = clampAtWord(
      copy[field as OccasionStoryField],
      OCCASION_STORY_MAX_LENGTHS[field],
    );
  }
  const verdict = await moderateText(Object.values(copy).join("\n"), `Textes d'étape histoire pour "${input.name}"`);
  if (verdict.flagged) {
    await writeAuditLog({
      action: "ai.occasion_story_copy.blocked",
      actorId,
      metadata: { name: input.name, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return copy;
}
