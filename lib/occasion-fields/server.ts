import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { db, getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { validateOccasionAnswers, type AnswerErrorCode } from "./answers";
import type {
  OccasionAnswer,
  OccasionFieldClientDefinition,
  OccasionFieldConfig,
  OccasionFieldDefinition,
  OccasionFieldOption,
  ResolvedAnswer,
} from "./types";

type FieldRow = typeof occasionFields.$inferSelect;

function toDefinition(row: FieldRow): OccasionFieldDefinition {
  return {
    id: row.id,
    occasionId: row.occasionId,
    key: row.key,
    label: row.label,
    helpText: row.helpText,
    icon: row.icon,
    placeholder: row.placeholder,
    type: row.type as OccasionFieldDefinition["type"],
    options: (row.options ?? []) as OccasionFieldOption[],
    config: (row.config ?? {}) as OccasionFieldConfig,
    required: row.required,
    aiHint: row.aiHint,
    sortOrder: row.sortOrder,
    translations: row.translations as OccasionFieldDefinition["translations"],
  };
}

/** Retire la consigne IA avant d'envoyer la définition au navigateur. */
export function toClientDefinition(row: FieldRow): OccasionFieldClientDefinition {
  const { aiHint, ...client } = toDefinition(row);
  void aiHint;
  return client;
}

export function pickTitleValue(answers: ResolvedAnswer[], titleFieldId: string | null | undefined): string {
  if (!titleFieldId) return "";
  return answers.find((answer) => answer.fieldId === titleFieldId)?.value ?? "";
}

/** Champs actifs de toutes les occasions, groupés par `occasion.id`, sans consigne IA. */
export async function getActiveOccasionFields(
  options: { demo?: boolean } = {},
): Promise<Record<string, OccasionFieldClientDefinition[]>> {
  try {
    const rows = await db
      .select()
      .from(occasionFields)
      .where(eq(occasionFields.active, true))
      .orderBy(asc(occasionFields.occasionId), asc(occasionFields.sortOrder), asc(occasionFields.label));
    const grouped: Record<string, OccasionFieldClientDefinition[]> = {};
    for (const row of rows) (grouped[row.occasionId] ??= []).push(toClientDefinition(row));
    return grouped;
  } catch (error) {
    if (options.demo) return {};
    throw error;
  }
}

export class OccasionDetailsError extends Error {
  constructor(public readonly errors: Record<string, AnswerErrorCode>) {
    super("OCCASION_DETAILS_INVALID");
  }
}

/**
 * Revalide les réponses d'un client contre les définitions en base (l'occasion est retrouvée par
 * son nom français, valeur canonique). Une occasion inconnue n'a aucun champ : toute réponse est refusée.
 */
export async function resolveOccasionDetails(
  occasionName: string,
  raw: OccasionAnswer[],
): Promise<{ answers: ResolvedAnswer[]; titleValue: string }> {
  const database = getServiceDb();
  const [occasion] = await database
    .select({ id: occasions.id, titleFieldId: occasions.titleFieldId })
    .from(occasions)
    .where(sql`lower(${occasions.name}) = lower(${occasionName})`)
    .limit(1);
  const rows = occasion
    ? await database
        .select()
        .from(occasionFields)
        .where(and(eq(occasionFields.occasionId, occasion.id), eq(occasionFields.active, true)))
        .orderBy(asc(occasionFields.sortOrder))
    : [];
  const result = validateOccasionAnswers(rows.map(toDefinition), raw);
  if (!result.ok) throw new OccasionDetailsError(result.errors);
  return { answers: result.answers, titleValue: pickTitleValue(result.answers, occasion?.titleFieldId) };
}
