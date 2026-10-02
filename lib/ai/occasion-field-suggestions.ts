import "server-only";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";
import {
  parseBlockProposal,
  sanitizeFieldProposals,
  sanitizeSingleProposal,
  MAX_AI_FIELD_PROPOSALS,
  type FieldProposal,
} from "@/lib/occasion-fields/ai-schema";

const SYSTEM_INSTRUCTIONS =
  "Tu es l'assistant éditorial de MusikPro, un SaaS qui génère des chansons personnalisées. Tu réponds uniquement par du JSON valide, sans commentaire ni balise Markdown.";

const FIELD_SPEC =
  "Un champ est un objet JSON : {\"label\": libellé français court affiché au client (2 à 80 caractères), \"type\": \"short_text\" | \"long_text\" | \"select\" | \"number\" | \"date\", \"icon\": UN seul emoji, \"placeholder\": exemple court dans le champ (peut être vide), \"helpText\": aide courte (peut être vide), \"options\": [{\"label\": choix français, \"emoji\": un emoji}] (2 à 12 choix, uniquement pour select, sinon []), \"required\": booléen, \"aiHint\": consigne EN ANGLAIS de 200 caractères maximum qui explique au parolier IA comment utiliser la réponse, \"min\": entier et \"max\": entier (uniquement pour number), \"maxLength\": entier (uniquement pour les textes)}. " +
  "Choisis le type le plus adapté : short_text pour un nom ou une courte information, long_text pour une anecdote, select pour un choix fermé (mois, type, humeur…), number pour un âge ou un jour, date pour une date complète. " +
  "Ne propose JAMAIS de champ demandant une donnée sensible : santé, pièce d'identité, numéro de téléphone, adresse, paiement, mot de passe, orientation ou opinion. Les champs doivent aider à personnaliser les paroles de la chanson.";

async function ask(prompt: string, audit: { actorId?: string; action: string; subject: string }) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const raw = await runProviderTextTask(provider, SYSTEM_INSTRUCTIONS, prompt);
  const verdict = await moderateText(raw.text, audit.subject);
  if (verdict.flagged) {
    await writeAuditLog({
      action: audit.action,
      actorId: audit.actorId,
      metadata: { subject: audit.subject, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return raw.text;
}

type OccasionContext = { id: string; name: string; description: string };
type ExistingField = { id: string; label: string; type: string };

export async function suggestFieldsForOccasion(
  occasion: OccasionContext,
  existing: ExistingField[],
  room: number,
  actorId?: string,
): Promise<FieldProposal[]> {
  const already = existing.length ? existing.map((field) => `« ${field.label} » (${field.type})`).join(", ") : "aucun";
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Champs déjà configurés : ${already}.\n` +
      `Propose jusqu'à ${Math.min(MAX_AI_FIELD_PROPOSALS, room)} NOUVEAUX champs complémentaires (sans répéter les existants) que le client remplira pour que le parolier personnalise la chanson. ${FIELD_SPEC}\n` +
      "Réponds par un tableau JSON de champs.",
    { actorId, action: "ai.occasion_fields.blocked", subject: `Champs proposés pour l'occasion "${occasion.name}"` },
  );
  return sanitizeFieldProposals(text, {
    occasionId: occasion.id,
    existingLabels: existing.map((field) => field.label),
    room,
  });
}

export async function completeFieldForOccasion(
  occasion: OccasionContext,
  label: string,
  actorId?: string,
): Promise<FieldProposal | null> {
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Le propriétaire veut un champ intitulé « ${label} ». Complète sa définition. ${FIELD_SPEC}\n` +
      "Conserve le libellé fourni (tu peux seulement corriger l'orthographe). Réponds par UN objet JSON.",
    { actorId, action: "ai.occasion_field.blocked", subject: `Champ "${label}" pour l'occasion "${occasion.name}"` },
  );
  return sanitizeSingleProposal(text, { occasionId: occasion.id });
}

export async function suggestBlocksForOccasion(
  occasion: OccasionContext,
  fields: Array<{ id: string; label: string }>,
  actorId?: string,
) {
  const list = fields.length ? fields.map((field) => `« ${field.label} »`).join(", ") : "aucun";
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Champs configurés : ${list}.\n` +
      "Décide quels blocs fixes du formulaire ont du sens : « showRecipient » (la personne à qui la chanson est destinée : nom, prononciation, lien) et « showSender » (de la part de qui). " +
      "Pour une chanson publicitaire ou sans destinataire, mets-les à false. « titleFieldLabel » est le libellé EXACT d'un champ configuré dont la valeur peut servir de titre quand il n'y a pas de destinataire (ex. nom du produit), sinon null. " +
      "Réponds par un objet JSON : {\"showRecipient\": bool, \"showSender\": bool, \"titleFieldLabel\": string | null}.",
    { actorId, action: "ai.occasion_blocks.blocked", subject: `Blocs proposés pour l'occasion "${occasion.name}"` },
  );
  return parseBlockProposal(text, fields);
}
