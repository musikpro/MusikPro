import { z } from "zod";
import {
  MAX_ACTIVE_FIELDS_PER_OCCASION,
  UNKNOWN_FIELD_KEY,
  type OccasionAnswer,
  type OccasionFieldClientDefinition,
  type ResolvedAnswer,
} from "./types";

export type AnswerErrorCode = "required" | "option" | "number" | "range" | "date" | "length" | "unknown" | "duplicate";

export const ANSWER_ERROR_MESSAGES: Record<AnswerErrorCode, string> = {
  required: "Ce champ est obligatoire.",
  option: "Choisis une option proposée.",
  number: "Entre un nombre entier valide.",
  range: "La valeur est hors des limites autorisées.",
  date: "Entre une date valide.",
  length: "Le texte est trop long.",
  unknown: "Un champ ne correspond plus à cette occasion. Recharge la page.",
  duplicate: "Une réponse est en double.",
};

export type AnswerValidation =
  | { ok: true; answers: ResolvedAnswer[] }
  | { ok: false; errors: Record<string, AnswerErrorCode> };

type RuleField = OccasionFieldClientDefinition & { aiHint?: string };

export const occasionAnswersSchema = z
  .array(
    z.object({
      fieldId: z.string().trim().min(1).max(120),
      value: z.string().trim().max(600),
    }),
  )
  .max(MAX_ACTIVE_FIELDS_PER_OCCASION)
  .optional()
  .default([]);

const TEXT_DEFAULT_MAX = { short_text: 100, long_text: 300 } as const;
const TEXT_HARD_MAX = { short_text: 200, long_text: 600 } as const;
const NUMBER_DEFAULT_MIN = -1_000_000;
const NUMBER_DEFAULT_MAX = 1_000_000;

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function checkValue(field: RuleField, value: string): AnswerErrorCode | null {
  switch (field.type) {
    case "short_text":
    case "long_text": {
      const limit = Math.min(field.config.maxLength ?? TEXT_DEFAULT_MAX[field.type], TEXT_HARD_MAX[field.type]);
      return value.length > limit ? "length" : null;
    }
    case "select":
      return field.options.some((option) => option.label === value) ? null : "option";
    case "number": {
      if (!/^-?\d+$/.test(value)) return "number";
      const number = Number(value);
      const min = field.config.min ?? NUMBER_DEFAULT_MIN;
      const max = field.config.max ?? NUMBER_DEFAULT_MAX;
      return number < min || number > max ? "range" : null;
    }
    case "date":
      return isValidIsoDate(value) ? null : "date";
  }
}

/** Valide les réponses contre les définitions (client : sans `aiHint` ; serveur : avec). */
export function validateOccasionAnswers(fields: RuleField[], raw: OccasionAnswer[]): AnswerValidation {
  const errors: Record<string, AnswerErrorCode> = {};
  const known = new Set(fields.map((field) => field.id));
  const given = new Map<string, string>();
  for (const answer of raw) {
    if (!known.has(answer.fieldId)) {
      errors[UNKNOWN_FIELD_KEY] = "unknown";
      continue;
    }
    if (given.has(answer.fieldId)) {
      errors[answer.fieldId] = "duplicate";
      continue;
    }
    given.set(answer.fieldId, answer.value.trim());
  }

  const answers: ResolvedAnswer[] = [];
  for (const field of [...fields].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (errors[field.id]) continue;
    const value = given.get(field.id) ?? "";
    if (!value) {
      if (field.required) errors[field.id] = "required";
      continue;
    }
    const problem = checkValue(field, value);
    if (problem) {
      errors[field.id] = problem;
      continue;
    }
    answers.push({
      fieldId: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      value,
      aiHint: field.aiHint ?? "",
    });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

/** Bloc ajouté au prompt des paroles. Les espaces/retours à la ligne sont aplatis : une valeur ne peut pas ajouter de lignes. */
export function formatAnswersForPrompt(answers: ResolvedAnswer[]): string {
  if (!answers.length) return "";
  const lines = answers.map((answer) => {
    const value = answer.value.replace(/\s+/g, " ").trim();
    const hint = answer.aiHint.replace(/\s+/g, " ").trim();
    return `- ${answer.label} : ${value}${hint ? ` (consigne : ${hint})` : ""}`;
  });
  return `Informations personnalisées:\n${lines.join("\n")}`;
}

/** Charge utile envoyée à l'API : uniquement les champs de l'occasion courante, réponses non vides. */
export function buildOccasionDetails(
  fields: Array<Pick<OccasionFieldClientDefinition, "id">>,
  details: Record<string, string>,
): OccasionAnswer[] {
  return fields
    .map((field) => ({ fieldId: field.id, value: (details[field.id] ?? "").trim() }))
    .filter((answer) => answer.value !== "");
}
