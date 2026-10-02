import { z } from "zod";
import { OCCASION_EMOJI_OPTIONS } from "@/lib/occasions/catalog";
import {
  MAX_SELECT_OPTIONS,
  OCCASION_FIELD_TYPES,
  type OccasionFieldConfig,
  type OccasionFieldOption,
} from "./types";

const EMOJI_ONLY = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;
const OPTION_LINE = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s+(.+)$/u;

/** Icônes proposées pour un champ : celles des occasions + quelques icônes de formulaire. */
export const FIELD_ICON_OPTIONS = [
  ...OCCASION_EMOJI_OPTIONS,
  { value: "📅", label: "Date" },
  { value: "🗓️", label: "Calendrier" },
  { value: "📍", label: "Lieu" },
  { value: "📝", label: "Note" },
  { value: "⭐", label: "Étoile" },
  { value: "🏷️", label: "Étiquette" },
  { value: "🎯", label: "Objectif" },
  { value: "📣", label: "Annonce" },
  { value: "📖", label: "Livre" },
  { value: "🔢", label: "Nombre" },
] as const;

export function parseOptionsText(text: string): OccasionFieldOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(OPTION_LINE);
      return match ? { emoji: match[1], label: match[2].trim() } : { emoji: "", label: line };
    });
}

export function formatOptionsText(options: OccasionFieldOption[]): string {
  return options.map((option) => (option.emoji ? `${option.emoji} ${option.label}` : option.label)).join("\n");
}

export function slugifyFieldKey(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return slug || "champ";
}

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optionalInt = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional());

export const occasionFieldFormSchema = z
  .object({
    occasionId: z.string().trim().min(1).max(120),
    label: z.string().trim().min(2).max(80),
    helpText: z.string().trim().max(160).default(""),
    icon: z
      .string()
      .trim()
      .max(16)
      .refine((value) => value === "" || EMOJI_ONLY.test(value), "Emoji invalide.")
      .default(""),
    placeholder: z.string().trim().max(60).default(""),
    type: z.enum(OCCASION_FIELD_TYPES),
    optionsText: z.string().max(1500).default(""),
    display: z.enum(["dropdown", "tiles"]).default("tiles"),
    maxLength: optionalInt(1, 600),
    min: optionalInt(-1_000_000, 1_000_000),
    max: optionalInt(-1_000_000, 1_000_000),
    required: z.enum(["true", "false"]),
    aiHint: z.string().trim().max(200).default(""),
    active: z.enum(["true", "false"]),
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .superRefine((value, context) => {
    if (value.type === "select") {
      const options = parseOptionsText(value.optionsText);
      const labels = options.map((option) => option.label);
      if (options.length < 2 || options.length > MAX_SELECT_OPTIONS) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Une liste doit proposer 2 à 12 choix." });
      } else if (labels.some((label) => label.length > 60)) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Un choix dépasse 60 caractères." });
      } else if (new Set(labels).size !== labels.length) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Deux choix portent le même nom." });
      }
    }
    if (value.type === "short_text" && (value.maxLength ?? 0) > 200) {
      context.addIssue({ code: "custom", path: ["maxLength"], message: "Un texte court est limité à 200 caractères." });
    }
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({ code: "custom", path: ["min"], message: "Le minimum dépasse le maximum." });
    }
  })
  .transform((value) => {
    const config: OccasionFieldConfig = {};
    if (value.type === "short_text") config.maxLength = value.maxLength ?? 100;
    if (value.type === "long_text") config.maxLength = value.maxLength ?? 300;
    if (value.type === "select") config.display = value.display;
    if (value.type === "number") {
      if (value.min !== undefined) config.min = value.min;
      if (value.max !== undefined) config.max = value.max;
    }
    const { optionsText, display, maxLength, min, max, ...rest } = value;
    void display;
    void maxLength;
    void min;
    void max;
    return {
      ...rest,
      options: value.type === "select" ? parseOptionsText(optionsText) : [],
      config,
    };
  });

export type OccasionFieldFormRow = z.output<typeof occasionFieldFormSchema>;
