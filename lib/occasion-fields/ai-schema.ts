import { z } from "zod";
import { stripSparkleGlyphs } from "./forbidden-glyphs";
import { formatOptionsText, occasionFieldFormSchema, slugifyFieldKey } from "./form-schema";
import {
  OCCASION_FIELD_TYPES,
  type OccasionFieldConfig,
  type OccasionFieldOption,
  type OccasionFieldType,
} from "./types";

export const MAX_AI_FIELD_PROPOSALS = 6;

export type FieldProposal = {
  label: string;
  helpText: string;
  icon: string;
  placeholder: string;
  type: OccasionFieldType;
  options: OccasionFieldOption[];
  config: OccasionFieldConfig;
  required: boolean;
  aiHint: string;
};

/** Les modèles renvoient volontiers `null` pour « sans valeur » : on le traite comme absent. */
const nullable = <T extends z.ZodType>(schema: T) => z.preprocess((value) => (value === null ? undefined : value), schema);

const rawProposalSchema = z.object({
  label: z.string(),
  type: z.enum(OCCASION_FIELD_TYPES),
  icon: nullable(z.string().optional().default("")),
  placeholder: nullable(z.string().optional().default("")),
  helpText: nullable(z.string().optional().default("")),
  options: nullable(
    z
      .array(z.object({ label: z.string(), emoji: nullable(z.string().optional().default("")) }))
      .optional()
      .default([]),
  ),
  required: nullable(z.boolean().optional().default(false)),
  aiHint: nullable(z.string().optional().default("")),
  display: nullable(z.enum(["dropdown", "tiles"]).optional()),
  min: nullable(z.number().int().optional()),
  max: nullable(z.number().int().optional()),
  maxLength: nullable(z.number().int().optional()),
});

/** Coupe proprement (sur un espace si possible) au nombre de caractères imposé par le formulaire. */
function clip(text: string, max: number): string {
  const value = text.trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}

/** Extrait le premier tableau ou objet JSON d'une réponse de LLM (balises Markdown ou texte autour tolérés). */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const end = cleaned.lastIndexOf(open === "[" ? "]" : "}");
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const normalizeLabel = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Entrée de `occasionFieldFormSchema` à partir d'une proposition (tout en chaînes, comme un FormData). */
export function proposalToFormInput(proposal: FieldProposal, occasionId: string, sortOrder: number): Record<string, string> {
  const input: Record<string, string> = {
    occasionId,
    label: proposal.label,
    helpText: proposal.helpText,
    icon: proposal.icon,
    placeholder: proposal.placeholder,
    type: proposal.type,
    optionsText: formatOptionsText(proposal.options),
    display: proposal.config.display ?? "tiles",
    required: String(proposal.required),
    aiHint: proposal.aiHint,
    active: "true",
    sortOrder: String(sortOrder),
  };
  if (proposal.config.maxLength !== undefined) input.maxLength = String(proposal.config.maxLength);
  if (proposal.config.min !== undefined) input.min = String(proposal.config.min);
  if (proposal.config.max !== undefined) input.max = String(proposal.config.max);
  return input;
}

/**
 * Les modèles joignent des bornes numériques hors sujet (« maxLength: 0 » sur une liste de choix,
 * min > max…) qui faisaient rejeter toute la proposition. On ne garde que celles qui ont un sens pour
 * le type ; les autres retombent sur les valeurs par défaut du schéma.
 */
function usableLimits(value: { type: OccasionFieldType; maxLength?: number; min?: number; max?: number }) {
  const limits: Record<string, string> = {};
  if (value.type === "short_text" || value.type === "long_text") {
    const cap = value.type === "short_text" ? 200 : 600;
    if (value.maxLength !== undefined && value.maxLength >= 1 && value.maxLength <= cap) limits.maxLength = String(value.maxLength);
  }
  if (value.type === "number") {
    const inRange = (n?: number) => n !== undefined && Math.abs(n) <= 1_000_000;
    const min = inRange(value.min) ? value.min : undefined;
    const max = inRange(value.max) ? value.max : undefined;
    if (min !== undefined && max !== undefined && min > max) return limits;
    if (min !== undefined) limits.min = String(min);
    if (max !== undefined) limits.max = String(max);
  }
  return limits;
}

function toProposal(candidate: unknown, occasionId: string): FieldProposal | null {
  const raw = rawProposalSchema.safeParse(candidate);
  if (!raw.success) return null;
  // Les modèles ajoutent volontiers un emoji d'étincelles : on le retire avant validation (pictogrammes étincelles interdits).
  const value = {
    ...raw.data,
    icon: stripSparkleGlyphs(raw.data.icon),
    options: raw.data.options.map((option) => ({ ...option, emoji: stripSparkleGlyphs(option.emoji) })),
  };
  const limits = usableLimits(value);
  const input = {
    occasionId,
    label: clip(value.label, 80),
    helpText: clip(value.helpText, 160),
    icon: value.icon,
    placeholder: clip(value.placeholder, 60),
    type: value.type,
    optionsText: formatOptionsText(value.options),
    display: value.display ?? "tiles",
    required: String(value.required),
    aiHint: clip(value.aiHint, 200),
    active: "true",
    sortOrder: "100",
    ...limits,
  };
  const parsed = occasionFieldFormSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    label: parsed.data.label,
    helpText: parsed.data.helpText,
    icon: parsed.data.icon,
    placeholder: parsed.data.placeholder,
    type: parsed.data.type,
    options: parsed.data.options,
    config: parsed.data.config,
    required: parsed.data.required === "true",
    aiHint: parsed.data.aiHint,
  };
}

export function sanitizeFieldProposals(
  rawText: string,
  ctx: { occasionId: string; existingLabels: string[]; room: number },
): FieldProposal[] {
  const json = extractJson(rawText);
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { fields?: unknown }).fields)
      ? (json as { fields: unknown[] }).fields
      : [];
  const seen = new Set(ctx.existingLabels.map(normalizeLabel));
  const result: FieldProposal[] = [];
  for (const candidate of list) {
    if (result.length >= Math.min(MAX_AI_FIELD_PROPOSALS, ctx.room)) break;
    const proposal = toProposal(candidate, ctx.occasionId);
    if (!proposal) continue;
    const key = normalizeLabel(proposal.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(proposal);
  }
  return result;
}

export function sanitizeSingleProposal(rawText: string, ctx: { occasionId: string }): FieldProposal | null {
  const json = extractJson(rawText);
  return json && typeof json === "object" && !Array.isArray(json) ? toProposal(json, ctx.occasionId) : null;
}

const blockProposalSchema = z.object({
  showRecipient: z.boolean(),
  showSender: z.boolean(),
  titleFieldLabel: z.string().nullable().optional(),
});

export function parseBlockProposal(
  rawText: string,
  fields: Array<{ id: string; label: string }>,
): { showRecipient: boolean; showSender: boolean; titleFieldId: string | null } | null {
  const parsed = blockProposalSchema.safeParse(extractJson(rawText));
  if (!parsed.success) return null;
  const wanted = parsed.data.titleFieldLabel ? normalizeLabel(parsed.data.titleFieldLabel) : "";
  const match = wanted ? fields.find((field) => normalizeLabel(field.label) === wanted) : undefined;
  return {
    showRecipient: parsed.data.showRecipient,
    showSender: parsed.data.showSender,
    titleFieldId: match?.id ?? null,
  };
}

const clientProposalSchema = z.object({
  label: z.string(),
  helpText: z.string().default(""),
  icon: z.string().default(""),
  placeholder: z.string().default(""),
  type: z.enum(OCCASION_FIELD_TYPES),
  options: z.array(z.object({ label: z.string(), emoji: z.string().default("") })).default([]),
  config: z
    .object({
      display: z.enum(["dropdown", "tiles"]).optional(),
      min: z.number().int().optional(),
      max: z.number().int().optional(),
      maxLength: z.number().int().optional(),
    })
    .default({}),
  required: z.boolean().default(false),
  aiHint: z.string().default(""),
});

export type PlannedFieldInsert = ReturnType<typeof occasionFieldFormSchema.parse> & { key: string; sortOrder: number };

/**
 * Valide TOUTES les propositions envoyées par le navigateur avant le moindre insert (tout ou rien),
 * attribue des ordres croissants <= 999 et des clés uniques y compris entre propositions du même lot.
 * Lève une Error en français si une proposition est invalide.
 */
export function planProposalInserts(
  proposals: unknown[],
  ctx: { occasionId: string; lastSortOrder: number; takenKeys: Iterable<string> },
): PlannedFieldInsert[] {
  const count = proposals.length;
  const base = Math.max(0, Math.min(ctx.lastSortOrder + 10, 999 - 10 * (count - 1)));
  const taken = new Set(ctx.takenKeys);
  return proposals.map((candidate, index) => {
    const client = clientProposalSchema.safeParse(candidate);
    if (!client.success) throw new Error(`Proposition ${index + 1} invalide : relance la suggestion.`);
    const sortOrder = base + 10 * index;
    const parsed = occasionFieldFormSchema.safeParse(
      proposalToFormInput(client.data as FieldProposal, ctx.occasionId, sortOrder),
    );
    if (!parsed.success) throw new Error(`Proposition « ${client.data.label} » invalide : relance la suggestion.`);
    const root = slugifyFieldKey(parsed.data.label);
    let key = root;
    for (let n = 2; taken.has(key); n += 1) {
      if (n >= 100) throw new Error("Impossible de générer un identifiant unique pour ce champ.");
      key = `${root}_${n}`;
    }
    taken.add(key);
    return { ...parsed.data, key, sortOrder };
  });
}
