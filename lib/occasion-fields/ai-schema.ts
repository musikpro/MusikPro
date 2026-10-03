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

const rawProposalSchema = z.object({
  label: z.string(),
  type: z.enum(OCCASION_FIELD_TYPES),
  icon: z.string().optional().default(""),
  placeholder: z.string().optional().default(""),
  helpText: z.string().optional().default(""),
  options: z
    .array(z.object({ label: z.string(), emoji: z.string().optional().default("") }))
    .optional()
    .default([]),
  required: z.boolean().optional().default(false),
  aiHint: z.string().optional().default(""),
  display: z.enum(["dropdown", "tiles"]).optional(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  maxLength: z.number().int().optional(),
});

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

function toProposal(candidate: unknown, occasionId: string): FieldProposal | null {
  const raw = rawProposalSchema.safeParse(candidate);
  if (!raw.success) return null;
  // Les modèles ajoutent volontiers un emoji d'étincelles : on le retire avant validation (pictogrammes étincelles interdits).
  const value = {
    ...raw.data,
    icon: stripSparkleGlyphs(raw.data.icon),
    options: raw.data.options.map((option) => ({ ...option, emoji: stripSparkleGlyphs(option.emoji) })),
  };
  const input = {
    occasionId,
    label: value.label,
    helpText: value.helpText,
    icon: value.icon,
    placeholder: value.placeholder,
    type: value.type,
    optionsText: formatOptionsText(value.options),
    display: value.display ?? "tiles",
    required: String(value.required),
    aiHint: value.aiHint,
    active: "true",
    sortOrder: "100",
    ...(value.maxLength !== undefined ? { maxLength: String(value.maxLength) } : {}),
    ...(value.min !== undefined ? { min: String(value.min) } : {}),
    ...(value.max !== undefined ? { max: String(value.max) } : {}),
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
