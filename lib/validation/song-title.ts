import { z } from "zod";
import { stripVersionSuffix } from "@/lib/ai/song-title";

/**
 * Titre d'une chanson saisi par le propriétaire. Les titres sont du contenu affiché tel quel (jamais
 * traduit) : on borne la longueur et on interdit balises (< >) et caractères de contrôle, comme pour le nom
 * d'utilisateur. Un suffixe « — Version N » saisi est ignoré (il est rajouté par version au stockage).
 */
export const songTitleSchema = z
  .string()
  .trim()
  .max(120, "Le titre est trop long (120 caractères au maximum).")
  .regex(/^[^\u0000-\u001F\u007F<>]*$/u, "Le titre ne peut pas contenir les caractères < ou >.")
  .refine((value) => stripVersionSuffix(value).trim().length >= 2, "Indique un titre d’au moins 2 caractères.");

export const renameSongSchema = z.object({
  jobId: z.string().trim().min(1).max(120),
  title: songTitleSchema,
});

/** Identifiant d'une version générée, reçu d'un formulaire du tableau de bord propriétaire. */
export const songJobIdSchema = z.object({ jobId: z.string().trim().min(1).max(120) });

/** Ajout ou retrait d'une chanson de Découvrir depuis /admin/generations. */
export const songDiscoverSchema = z.object({
  songGroupId: z.string().trim().min(1).max(120),
  visible: z.enum(["true", "false"]),
});
