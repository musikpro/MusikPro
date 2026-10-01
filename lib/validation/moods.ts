import { z } from "zod";
import { MOOD_AI_HINT_MAX_LENGTH } from "@/lib/moods/catalog";

/** Un emoji (ou une courte séquence d'emojis) : jamais de lettres, chiffres ni balises. */
const emojiField = z
  .string()
  .trim()
  .min(1, "Choisis un emoji.")
  .max(16)
  .refine((value) => !/[\p{L}\p{N}<>&"']/u.test(value), "Choisis un emoji dans la liste proposée.");

export const moodFormSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères.").max(40, "40 caractères maximum."),
  description: z.string().trim().max(60, "60 caractères maximum."),
  emoji: emojiField,
  aiHint: z.string().trim().max(MOOD_AI_HINT_MAX_LENGTH, `${MOOD_AI_HINT_MAX_LENGTH} caractères maximum.`),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const moodIdSchema = z.object({ id: z.string().trim().min(1).max(120) });
export const toggleMoodSchema = moodIdSchema.extend({ active: z.enum(["true", "false"]) });
export const moodAiHintRequestSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(60).optional().default(""),
});

export const reorderMoodsSchema = z.object({
  order: z
    .string()
    .max(30000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Ordre invalide." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(200))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque ambiance doit apparaître une seule fois."),
});

export function slugifyMood(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
