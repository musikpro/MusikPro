import { z } from "zod";
import { ACCENT_HINT_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

const languageCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/);

/**
 * Variante d'accent saisie par le propriétaire. `aiHint` part tel quel chez Musicful : en anglais, une ligne
 * (pas de saut de ligne), courte. `styleIds` : styles qui utilisent cette variante pour sa langue.
 */
export const languageAccentSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  languageCode,
  name: z.string().trim().min(2).max(60),
  aiHint: z
    .string()
    .trim()
    .min(3, "Rédige la consigne en anglais.")
    .max(ACCENT_HINT_MAX_LENGTH, `La consigne ne doit pas dépasser ${ACCENT_HINT_MAX_LENGTH} caractères.`)
    .refine((value) => !/[\r\n]/.test(value), "La consigne tient sur une seule ligne."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
  styleIds: z.array(z.string().trim().min(1).max(120)).max(200),
});
export type LanguageAccentInput = z.infer<typeof languageAccentSchema>;
