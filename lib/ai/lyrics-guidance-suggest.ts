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

function promptFor(kind: LyricsGuidanceKind, name: string, description: string) {
  const context = description ? ` Description : « ${description} ».` : "";
  if (kind === "occasion")
    return (
      `Occasion d'une chanson personnalisée : « ${name} ».${context}\n` +
      "Rédige EN FRANÇAIS une consigne destinée à une IA qui écrit les PAROLES de cette chanson. Elle règle le FOND et le TON : registre émotionnel, thèmes et moments à évoquer, ce qu'il faut absolument mettre dans le texte, et ce qu'il faut éviter. " +
      "Public : francophones d'Afrique et de la diaspora. Ne parle ni de musique ni de rythme (un autre champ s'en charge). " +
      `Un seul paragraphe de 2 à 4 phrases à l'impératif, ${TARGET_MAX} caractères maximum, sans émoji ni puce. Réponds uniquement avec la consigne.`
    );
  return (
    `Style musical : « ${name} ».${context}\n` +
    "Rédige EN FRANÇAIS une consigne destinée à une IA qui écrit les PAROLES d'une chanson dans ce style. Elle règle la FORME du texte : flow, longueur et rythme des phrases, métrique, rimes, structure (couplets, refrain, pont), vocabulaire, expressions et interjections typiques du style, langue ou argot quand ils le caractérisent. " +
    "Ne décris ni les instruments ni le tempo (un autre champ s'en charge) et ne parle pas du thème de la chanson. " +
    `Un seul paragraphe de 2 à 4 phrases à l'impératif, ${TARGET_MAX} caractères maximum, sans émoji ni puce. Réponds uniquement avec la consigne.`
  );
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
    promptFor(input.kind, input.name, input.description ?? ""),
  );
  const text = clamp(raw.text);
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
