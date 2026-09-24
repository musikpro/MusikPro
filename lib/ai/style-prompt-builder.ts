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
  "Termine la chanson par un outro naturel : la mélodie et les instruments diminuent progressivement (fade-out) sur les dernières secondes, sans coupure brutale. Les deux interprétations générées pour cette demande doivent avoir des mélodies, arrangements et tempos nettement distincts l'un de l'autre, tout en respectant fidèlement ce style musical et ces paroles.";

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

export function buildStylePrompt(
  genreName: string,
  description: string | null | undefined,
  mood: string,
  strictStyleAdherence: boolean,
): string {
  let base = genreName;
  if (description) {
    base = strictStyleAdherence
      ? `${genreName} (${description}). Respecte fidèlement les codes rythmiques, instrumentaux et vocaux authentiques de ce style musical précis, sans dériver vers un genre plus générique.`
      : `${genreName} — ${description}`;
  }
  const withMood = mood ? `${base} — Ambiance : ${mood}` : base;
  const suffix = ` — ${PRODUCTION_DIRECTIVES}`;
  const budget = Math.max(0, MUSICFUL_STYLE_MAX_LENGTH - suffix.length);
  return `${truncateAtWord(withMood, budget)}${suffix}`;
}
