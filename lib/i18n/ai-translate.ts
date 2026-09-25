import { getLyricsProvider } from "@/lib/ai/provider-core";
import { runProviderTextTask } from "@/lib/ai/text-generation-core";

/**
 * Not tagged "server-only": scripts/i18n-sync.mts (which runs outside Next's build via tsx)
 * imports this directly. It is still never imported by any client component — only by that
 * CLI script — so the client-bundling guard the rest of lib/ai/* carries is not needed here.
 */

export type TranslationLocale = "en" | "es" | "pt";

const LOCALE_NAMES: Record<TranslationLocale, string> = {
  en: "English",
  es: "Spanish (neutral, understandable across Latin America and Spain)",
  pt: "Portuguese (Brazilian)",
};

const SYSTEM_INSTRUCTIONS =
  "You are the localization assistant for MusikPro, a SaaS that generates personalized songs, expanding into English-, Spanish- and Portuguese-speaking markets. " +
  "Translate short user-interface strings from French. Keep the tone warm and concise, matching typical SaaS UI copy. " +
  'Preserve capitalization style, punctuation, emoji, and any placeholders or variables exactly. Do not translate product name "MusikPro". ' +
  "Respond with ONLY a single JSON object mapping each input string to its translation — no markdown fences, no commentary, no extra keys.";

function promptFor(locale: TranslationLocale, strings: string[]) {
  return (
    `Target language: ${LOCALE_NAMES[locale]}.\n` +
    "Translate each of the following French UI strings. Respond with a JSON object where each key is the EXACT original French string (unchanged) and each value is its translation.\n\n" +
    `French strings:\n${JSON.stringify(strings, null, 2)}`
  );
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** Translates a batch of French UI strings into one target locale via the connected AI provider. */
export async function translateBatch(locale: TranslationLocale, strings: string[]): Promise<Record<string, string>> {
  if (!strings.length) return {};
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

  const raw = await runProviderTextTask(provider, SYSTEM_INSTRUCTIONS, promptFor(locale, strings));
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw.text));
  } catch {
    throw new Error(`AI translation response was not valid JSON: ${raw.text.slice(0, 200)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("AI translation response was not a JSON object");

  // Models sometimes normalize typographic apostrophes (’ → ') when echoing a key back, even
  // when told to keep it exact — match on a normalized form instead of relying on a byte-exact
  // key, so those entries aren't silently dropped.
  const normalize = (value: string) => value.replace(/[‘’ʼ]/g, "'");
  const byNormalizedKey = new Map<string, string>();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) byNormalizedKey.set(normalize(key), value.trim());
  }

  const result: Record<string, string> = {};
  for (const key of strings) {
    const value = byNormalizedKey.get(normalize(key));
    if (value) result[key] = value;
  }
  return result;
}
