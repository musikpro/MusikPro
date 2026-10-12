import { z } from "zod";

/** Destinations possibles d'un lien du mode invité : formulaire de création (étape 1) ou accueil invité. */
export const GUEST_LINK_DESTINATIONS = ["create", "dashboard"] as const;
export type GuestLinkDestination = (typeof GUEST_LINK_DESTINATIONS)[number];

export const GUEST_LINK_RETENTION_DEFAULT_DAYS = 30;

/** Fragment d'URL public : minuscules, chiffres et tirets simples (ex. `pub-tiktok-1`), 3 à 40 caractères. */
export const guestLinkSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Le lien doit contenir au moins 3 caractères.")
  .max(40, "Le lien ne peut pas dépasser 40 caractères.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Utilise uniquement des lettres sans accent, des chiffres et des tirets simples.",
  );

export const guestLinkDestinationSchema = z.enum(GUEST_LINK_DESTINATIONS);

export const guestLinkFormSchema = z.object({
  label: z.string().trim().min(2, "Le nom du lien est trop court.").max(80, "Le nom du lien est trop long."),
  slug: guestLinkSlugSchema,
  destination: guestLinkDestinationSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: z.string().trim().max(240, "La note ne peut pas dépasser 240 caractères.").default(""),
});

export type GuestLinkFormValues = z.infer<typeof guestLinkFormSchema>;

export const guestLinkIdSchema = z.object({ id: z.string().trim().min(1).max(120) });

/** Chemin public du lien invité. */
export function guestLinkPath(slug: string): string {
  return `/g/${slug}`;
}

/** URL complète à copier dans une publicité (`base` sans ou avec barre finale). */
export function guestLinkUrl(base: string, slug: string): string {
  return `${base.replace(/\/+$/, "")}${guestLinkPath(slug)}`;
}
