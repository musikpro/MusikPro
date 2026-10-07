import { z } from "zod";
import { ANDROID_BLOB_PREFIX } from "@/lib/app-releases/constants";

/** Chemin d'un fichier envoyé dans le stockage privé : dossier fixe, nom sûr, extension .apk. */
const BLOB_PATHNAME = new RegExp(`^${ANDROID_BLOB_PREFIX.replaceAll("/", "\\/")}[A-Za-z0-9._-]{1,120}\\.apk$`);

export const registerAppReleaseSchema = z
  .object({
    pathname: z.string().max(200).regex(BLOB_PATHNAME, "Fichier invalide"),
    version: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,3}){1,2}$/, "Version invalide (exemple : 1.2 ou 1.2.3)"),
    build: z.coerce.number().int().min(1).max(2_000_000_000),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((value) => value || null),
  })
  .strict();
export type RegisterAppReleaseInput = z.infer<typeof registerAppReleaseSchema>;

export const releaseIdSchema = z.object({ id: z.string().min(1).max(64) }).strict();
