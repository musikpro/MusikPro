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
  "End the song with a natural outro: the melody and instruments gradually fade out (fade-out) over the last seconds, with no abrupt cut. The two versions generated for this request must have clearly distinct melodies, arrangements and tempos, while faithfully respecting this musical style and these lyrics.";

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

export function buildStylePrompt(
  genreName: string,
  description: string | null | undefined,
  mood: string,
  strictStyleAdherence: boolean,
  /** Consigne IA (anglais) de l'occasion ; vide : rien n'est envoyé pour l'occasion. */
  occasionHint = "",
): string {
  let base = genreName;
  // Le champ « Consigne IA » commence par « Nom du style : » + retour à la ligne : le nom est déjà envoyé en tête,
  // on retire donc ce préfixe pour ne pas le répéter.
  if (description) description = stripStyleNamePrefix(description, genreName);
  if (description) {
    base = strictStyleAdherence
      ? `${genreName} (${description}). Faithfully respect the authentic rhythmic, instrumental and vocal codes of this specific musical style, without drifting toward a more generic genre.`
      : `${genreName} — ${description}`;
  }
  // L'ambiance (nom + consigne IA éventuelle) et les directives sont toujours conservées : seule la
  // description du genre est tronquée pour rester sous la limite de Musicful.
  const occasionPart = occasionHint.trim() ? ` — Occasion: ${occasionHint.trim()}` : "";
  const moodPart = (mood ? ` — Mood: ${mood}` : "") + occasionPart;
  const suffix = ` — ${PRODUCTION_DIRECTIVES}`;
  const budget = Math.max(0, MUSICFUL_STYLE_MAX_LENGTH - suffix.length - moodPart.length);
  return `${truncateAtWord(base, budget)}${moodPart}${suffix}`;
}
