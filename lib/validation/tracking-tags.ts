import { z } from "zod";
import { TRACKING_CODE_MAX, trackingCodeError } from "@/lib/tracking-tags/parse";

export const TRACKING_NAME_MAX = 80;
export const TRACKING_PLACEMENTS = ["landing", "dashboard", "both"] as const;
export type TrackingPlacement = (typeof TRACKING_PLACEMENTS)[number];

const nameSchema = z
  .string()
  .trim()
  .min(1, "Donne un nom à la balise (ex. Facebook code).")
  .max(TRACKING_NAME_MAX, `Le nom est trop long (${TRACKING_NAME_MAX} caractères maximum).`);

const codeSchema = z
  .string()
  .trim()
  .min(1, "Colle le code de la balise.")
  .max(TRACKING_CODE_MAX, `Le code est trop long (${TRACKING_CODE_MAX} caractères maximum).`)
  .superRefine((value, ctx) => {
    const message = trackingCodeError(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });

const placementSchema = z.enum(TRACKING_PLACEMENTS, { message: "Choisis où la balise doit s'afficher." });

/** Création / modification : le formulaire envoie « enabled » seulement quand la case est cochée. */
export const trackingTagFormSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    name: nameSchema,
    code: codeSchema,
    placement: placementSchema,
    enabled: z.string().optional(),
  })
  .transform((value) => ({
    id: value.id || null,
    name: value.name,
    code: value.code,
    placement: value.placement,
    enabled: value.enabled === "on" || value.enabled === "true",
  }));

export const trackingTagIdSchema = z.object({ id: z.string().trim().min(1).max(64) });
