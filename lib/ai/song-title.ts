/**
 * Song titles follow one convention: "{Destinataire} — {Occasion} — {Style} — {mois année}", and each
 * stored version gets a trailing " — Version N". The group-level title shown next to the
 * "Version 1 / Version 2" labels drops that suffix again (stripVersionSuffix), so the UI never
 * shows it twice. Titles are user-facing generated content and are deliberately not translated.
 */
const TITLE_SEPARATOR = " — ";
const VERSION_SUFFIX = /\s+—\s+Version\s+\d+\s*$/i;

export function buildSongTitle(input: {
  recipientName?: string | null;
  occasion: string;
  genre: string;
  date?: Date;
}): string {
  const monthYear = (input.date ?? new Date()).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return [input.recipientName?.trim().slice(0, 60), input.occasion.trim(), input.genre.trim(), monthYear]
    .filter(Boolean)
    .join(TITLE_SEPARATOR);
}

export function withVersionSuffix(title: string, versionNumber: number): string {
  return `${title}${TITLE_SEPARATOR}Version ${versionNumber}`;
}

export function stripVersionSuffix(title: string): string {
  return title.replace(VERSION_SUFFIX, "");
}
