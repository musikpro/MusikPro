import "server-only";
import { createOpenAiClient, getLyricsProvider } from "./provider";
import { runAnthropicLyricsTask } from "./anthropic";

export type ModerationVerdict = {
  flagged: boolean;
  reason: string | null;
  categories: string[];
};

const MAX_MODERATION_INPUT_CHARS = 6_000;

const INSTRUCTIONS =
  "Tu es le classificateur de sécurité de contenu de MusikPro, un service qui génère des chansons personnalisées. " +
  "Analyse UNIQUEMENT le texte fourni et signale-le seulement s'il contient : violence grave ou explicite, contenu " +
  "sexuel impliquant des mineurs, incitation à la haine, harcèlement grave, apologie du terrorisme, ou instructions " +
  "dangereuses (fabrication d'armes, de drogues, automutilation). Le contenu émotionnel normal d'une chanson " +
  "personnalisée (amour, deuil, rupture, conflit familial, chagrin, nostalgie) n'est PAS à signaler. Réponds " +
  'UNIQUEMENT avec un objet JSON strict, sans texte autour : {"flagged": boolean, "categories": string[], "reason": ' +
  'string}. "reason" doit être une chaîne vide si flagged vaut false.';

function parseVerdict(raw: string): ModerationVerdict {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed: unknown = JSON.parse(match ? match[0] : raw);
    if (!parsed || typeof parsed !== "object") throw new Error("not_an_object");
    const record = parsed as Record<string, unknown>;
    return {
      flagged: Boolean(record.flagged),
      reason: typeof record.reason === "string" && record.reason ? record.reason : null,
      categories: Array.isArray(record.categories)
        ? record.categories.filter((c): c is string => typeof c === "string")
        : [],
    };
  } catch {
    // A malformed classifier response must never silently let unmoderated content through —
    // fail closed (flag it) rather than fail open on a parsing error.
    return { flagged: true, reason: "Réponse du modérateur illisible.", categories: ["classifier_error"] };
  }
}

/**
 * Deliberately reuses the same AI provider already configured for lyrics (`getLyricsProvider`),
 * exactly like pronunciation suggestions — no separate moderation provider or key. If that
 * provider isn't configured, moderation is skipped (fails open) rather than blocking every
 * generation because a provider is temporarily unconfigured.
 */
export async function moderateText(text: string, label: string): Promise<ModerationVerdict> {
  const trimmed = text.trim();
  if (!trimmed) return { flagged: false, reason: null, categories: [] };
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) return { flagged: false, reason: null, categories: [] };
  const prompt = `Contexte : ${label}\n\nTexte à analyser :\n"""\n${trimmed.slice(0, MAX_MODERATION_INPUT_CHARS)}\n"""`;
  if (provider.provider === "anthropic") {
    const result = await runAnthropicLyricsTask(provider.apiKey, provider.model, 300, INSTRUCTIONS, prompt);
    return parseVerdict(result.text);
  }
  const response = await createOpenAiClient(provider.apiKey).responses.create({
    model: provider.model,
    instructions: INSTRUCTIONS,
    input: prompt,
    max_output_tokens: 300,
  });
  return parseVerdict(response.output_text.trim());
}
