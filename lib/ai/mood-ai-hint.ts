import "server-only";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";
import { MOOD_AI_HINT_MAX_LENGTH } from "@/lib/moods/catalog";

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
      "Rédige EN ANGLAIS une consigne très courte destinée à une IA de génération musicale (Musicful), sous forme de 4 à 6 mots-clés séparés par des virgules : adjectifs d'ambiance puis une ou deux qualités musicales (tempo, instruments, intensité). " +
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
