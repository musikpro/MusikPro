import { z } from "zod";
import {
  DEMO_DETAIL_MAX_CHARACTERS,
  DEMO_LYRICS_MAX_CHARACTERS,
  DEMO_STORY_MAX_CHARACTERS,
  demoCreationChoicesSchema,
} from "@/lib/validation/musikpro-demo";

/** Étapes du parcours de création où un brouillon peut être repris (routes sous `/dashboard/create/`). */
export const CREATION_DRAFT_STEPS = [
  "genre",
  "story",
  "style",
  "parameters",
  "recipient",
  "lyrics",
  "lyrics/edit",
  "pack",
  "confirm",
] as const;
export type CreationDraftStep = (typeof CREATION_DRAFT_STEPS)[number];

/** Un brouillon expire 30 jours après la dernière sauvegarde. */
export const CREATION_DRAFT_TTL_DAYS = 30;

const short = (max: number) => z.string().max(max);

/**
 * Contenu d'un brouillon : uniquement ce que le parcours saisit (choix, histoire, noms, paroles, détails
 * d'occasion). Strict : tout champ inconnu est refusé. Les tailles reprennent celles des champs du parcours.
 */
export const creationDraftDataSchema = z
  .object({
    choices: demoCreationChoicesSchema.strict(),
    fields: z
      .object({
        story: short(DEMO_STORY_MAX_CHARACTERS),
        recipientName: short(100),
        recipientPronunciation: short(160),
        senderName: short(100),
        senderPronunciation: short(160),
        lyrics: short(DEMO_LYRICS_MAX_CHARACTERS),
        detail: short(DEMO_DETAIL_MAX_CHARACTERS),
      })
      .strict(),
    details: z
      .record(z.string().min(1).max(80), short(DEMO_DETAIL_MAX_CHARACTERS))
      .refine((value) => Object.keys(value).length <= 40, "Trop de détails d'occasion."),
    packIndex: z.number().int().min(-1).max(50),
  })
  .strict();
export type CreationDraftData = z.infer<typeof creationDraftDataSchema>;

export const creationDraftSaveSchema = z
  .object({
    step: z.enum(CREATION_DRAFT_STEPS),
    data: creationDraftDataSchema,
  })
  .strict();
export type CreationDraftSave = z.infer<typeof creationDraftSaveSchema>;

/** Un brouillon n'a de valeur à reprendre qu'avec une occasion choisie et un minimum de contenu. */
export function isCreationDraftWorthKeeping(data: CreationDraftData): boolean {
  return data.choices.occasion.trim().length > 0;
}
