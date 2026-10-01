/**
 * Pure string-building logic for the Musicful `style` prompt, deliberately kept free of
 * "server-only"/"@/db" imports (unlike lib/ai/style-prompt.ts, which wraps this with the
 * catalog lookup) so it can be unit-tested directly — see tests/style-prompt-length.test.ts.
 */

/**
 * Musicful's official OpenAPI spec documents no parameter for ending/outro/fade-out control,
 * and no seed/diversity parameter for the two auto-generated variants a single request
 * returns — both are entirely up to the model given the free-text `style` it receives. These
 * two directives are the only available lever: they ask for a natural fade-out ending instead
 * of an abrupt stop, and for the pair to diverge musically instead of sounding near-identical.
 * Best-effort prompt guidance, not a guaranteed platform-level control.
 */
const PRODUCTION_DIRECTIVES =
  "End the song with a natural outro: fade-out gradually over the last seconds, with no abrupt cut. The two versions must have clearly distinct melodies, arrangements and tempos, while respecting this style and these lyrics.";

/**
 * Musicful's "Style of Music" field is capped at 1,000 characters (confirmed in Musicful's own
 * user guide for MF 1.5/1.5X/2.0, and empirically: MFV3.0 accepted a 778-char prompt but
 * rejected every 1,125-char one with a generic "Invalid request parameter" error). The catalog's
 * AI-generated `aiDescription` has no length ceiling of its own, so without this cap a verbose
 * description plus `PRODUCTION_DIRECTIVES` can silently push the request over the limit and fail
 * every single generation. Truncating the description first (never the mood or the directives,
 * which matter more per-request and are always short) keeps every request under the limit.
 */
export const MUSICFUL_STYLE_MAX_LENGTH = 1000;

/**
 * Longueur maximale (nom du style et « : » compris) de la consigne IA d'un style. Avec ambiance et occasion
 * (70 chacune), voix, phrase de rigueur et directives, le pire cas tient alors dans MUSICFUL_STYLE_MAX_LENGTH :
 * rien n'est tronqué (voir tests/moods-catalog.test.ts).
 */
export const STYLE_AI_DESCRIPTION_MAX_LENGTH = 420;

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd();
}

/**
 * Texte d'ambiance envoyé à Musicful : la consigne IA (anglais) rédigée par le propriétaire REMPLACE le nom
 * français ; sans consigne, repli sur le nom (comportement historique).
 */
export function buildMoodText(name: string, aiHint?: string | null): string {
  return aiHint?.trim() || name;
}

function stripStyleNamePrefix(description: string, genreName: string): string {
  const head = `${genreName.trim().toLowerCase()}:`;
  const text = description.trim();
  return text.toLowerCase().startsWith(head) ? text.slice(head.length).trim() : text;
}

/**
 * Consigne vocale en anglais (« Vocals: ») déduite des choix « Langue des paroles » et « Voix du chanteur » :
 * les valeurs françaises du client (Femme/Homme/Duo, Français/Anglais) sont converties en anglais pour
 * Musicful. Valeur inconnue : rien n'est ajouté pour elle.
 */
export function buildVocalHint(language: string, voice: string): string {
  const voices: Record<string, string> = {
    femme: "female lead vocals",
    female: "female lead vocals",
    homme: "male lead vocals",
    male: "male lead vocals",
    duo: "male and female duet vocals",
  };
  const languages: Record<string, string> = {
    français: "French",
    francais: "French",
    french: "French",
    anglais: "English",
    english: "English",
  };
  const voicePart = voices[voice.trim().toLowerCase()];
  const languagePart = languages[language.trim().toLowerCase()];
  return [voicePart, languagePart ? `sung in ${languagePart}` : ""].filter(Boolean).join(", ");
}

const STRICT_STYLE_SENTENCE =
  " Stay faithful to this style's authentic rhythmic, instrumental and vocal codes, without drifting toward a more generic genre.";

export function buildStylePrompt(
  genreName: string,
  description: string | null | undefined,
  mood: string,
  strictStyleAdherence: boolean,
  /** Consigne IA (anglais) de l'occasion ; vide : rien n'est envoyé pour l'occasion. */
  occasionHint = "",
  /** Consigne vocale en anglais (voix + langue chantée) ; vide : rien n'est ajouté. */
  vocalHint = "",
): string {
  // Le champ « Consigne IA » commence par « Nom du style : » : le nom est déjà envoyé en tête,
  // on retire donc ce préfixe pour ne pas le répéter.
  if (description) description = stripStyleNamePrefix(description, genreName);
  // L'ambiance (nom + consigne IA éventuelle), la consigne vocale et les directives sont toujours conservées :
  // seule la description du genre est tronquée pour rester sous la limite de Musicful.
  const occasionPart = occasionHint.trim() ? ` — Occasion: ${occasionHint.trim()}` : "";
  const vocalPart = vocalHint.trim() ? ` — Vocals: ${vocalHint.trim()}` : "";
  const moodPart = (mood ? ` — Mood: ${mood}` : "") + occasionPart + vocalPart;
  const suffix = ` — ${PRODUCTION_DIRECTIVES}`;
  const budget = Math.max(0, MUSICFUL_STYLE_MAX_LENGTH - suffix.length - moodPart.length);
  let base = genreName;
  if (description && strictStyleAdherence) {
    // La phrase de rigueur reste entière : on raccourcit la description, jamais cette phrase.
    const head = `${genreName} (`;
    const tail = `).${STRICT_STYLE_SENTENCE}`;
    base = `${head}${truncateAtWord(description, Math.max(0, budget - head.length - tail.length))}${tail}`;
  } else if (description) {
    base = `${genreName} — ${description}`;
  }
  return `${truncateAtWord(base, budget)}${moodPart}${suffix}`;
}
