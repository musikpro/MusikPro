import type { CatalogTranslations } from "@/lib/i18n/translate";

export const OCCASION_FIELD_TYPES = ["short_text", "long_text", "select", "number", "date"] as const;
export type OccasionFieldType = (typeof OCCASION_FIELD_TYPES)[number];

export const MAX_ACTIVE_FIELDS_PER_OCCASION = 8;
export const MAX_SELECT_OPTIONS = 12;
export const UNKNOWN_FIELD_KEY = "_unknown";

export type OccasionFieldOption = { label: string; emoji: string };

export type OccasionFieldConfig = {
  maxLength?: number;
  min?: number;
  max?: number;
  display?: "dropdown" | "tiles";
};

/** Définition envoyée au navigateur : jamais d'`aiHint`. */
export type OccasionFieldClientDefinition = {
  id: string;
  occasionId: string;
  key: string;
  label: string;
  helpText: string;
  icon: string;
  placeholder: string;
  type: OccasionFieldType;
  options: OccasionFieldOption[];
  config: OccasionFieldConfig;
  required: boolean;
  sortOrder: number;
  /** { en: { label, helpText, placeholder, option0, option1… }, es: …, pt: … } — voir `fieldTranslationInput`. */
  translations?: CatalogTranslations | null;
};

export type OccasionFieldDefinition = OccasionFieldClientDefinition & { aiHint: string };

export type OccasionAnswer = { fieldId: string; value: string };

export type ResolvedAnswer = {
  fieldId: string;
  key: string;
  label: string;
  type: OccasionFieldType;
  value: string;
  aiHint: string;
};

/** Champs français à traduire pour `translateCatalogTable` (clés plates, `option0…` pour les listes). */
export function fieldTranslationInput(field: {
  label: string;
  helpText: string;
  placeholder: string;
  options: OccasionFieldOption[];
}): Record<string, string> {
  return {
    label: field.label,
    helpText: field.helpText,
    placeholder: field.placeholder,
    ...Object.fromEntries(field.options.map((option, index) => [`option${index}`, option.label])),
  };
}
