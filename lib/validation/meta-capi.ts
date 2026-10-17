import { z } from "zod";

export const META_TEST_CODE_MAX = 32;

/** Identifiant du pixel / jeu de données Meta : uniquement des chiffres. */
const pixelIdSchema = z
  .string()
  .trim()
  .regex(/^\d{8,20}$/, "L'ID du pixel est composé de 8 à 20 chiffres (Gestionnaire d'événements → Paramètres).");

/** Token d'accès généré dans le Gestionnaire d'événements (lettres, chiffres, _ - .). */
const tokenSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.-]{20,512}$/, "Le token d'accès semble invalide (20 à 512 caractères, sans espace).");

const testCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,32}$/, "Le code de test est composé de lettres et chiffres (ex. TEST70629).");

/** Formulaire /admin/tracking-tags → API Conversions : un champ laissé vide ne change pas la valeur déjà enregistrée (token). */
export const metaCapiFormSchema = z
  .object({
    enabled: z.string().optional(),
    pixelId: z.union([pixelIdSchema, z.literal("")]).optional(),
    token: z.union([tokenSchema, z.literal("")]).optional(),
    testEventCode: z.union([testCodeSchema, z.literal("")]).optional(),
  })
  .transform((value) => ({
    enabled: value.enabled === "on" || value.enabled === "true",
    pixelId: value.pixelId || null,
    token: value.token || null,
    testEventCode: value.testEventCode || null,
  }));

/** Événement envoyé par la balise du navigateur (components/tracking/MetaCapiBeacon.tsx). */
export const metaBeaconSchema = z.object({
  eventName: z.literal("PageView"),
  eventId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{8,64}$/),
  path: z
    .string()
    .max(300)
    .regex(/^\/[^\s]*$/),
});
