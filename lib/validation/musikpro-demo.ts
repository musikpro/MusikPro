import { z } from "zod";

const words = (limit: number) => (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= limit;
export const DEMO_LYRICS_MAX_WORDS = 5000;
export const DEMO_LYRICS_MAX_CHARACTERS = 60000;
export const demoStorySchema = z
  .string()
  .trim()
  .min(10, "Raconte ton histoire en au moins 10 caractères.")
  .max(2000)
  .refine(words(250), "Maximum 250 mots.");
export const demoRecipientSchema = z.object({
  name: z.string().trim().min(2, "Indique le nom de la personne concernée.").max(100),
  pronunciation: z.string().trim().min(2, "Vérifie la prononciation suggérée.").max(160),
  relation: z.enum(
    [
      "Ma femme",
      "Mon mari",
      "Ma copine",
      "Mon copain",
      "Ma mère",
      "Mon père",
      "Mon oncle",
      "Ma tante",
      "Mes enfants",
      "Mon frère",
      "Ma sœur",
      "Un ami",
      "Une amie",
      "Pour moi",
      "Une personne qui compte",
    ],
    { error: "Choisis à qui la chanson est destinée." },
  ),
});
export const demoLyricsSchema = z
  .string()
  .trim()
  .min(1, "Ajoute des paroles.")
  .max(DEMO_LYRICS_MAX_CHARACTERS)
  .refine(words(DEMO_LYRICS_MAX_WORDS), `Maximum ${DEMO_LYRICS_MAX_WORDS} mots.`);
export const demoDetailSchema = z.string().max(3000).refine(words(50), "Maximum 50 mots.");
export const demoProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  location: z.string().trim().min(2).max(150),
});
export const demoSupportSchema = z.object({
  subject: z.string().trim().min(2).max(150),
  category: z.enum(["Problème technique", "Compte", "Packs"]),
  message: z.string().trim().min(10).max(5000),
  email: z.email().max(254),
  phone: z
    .string()
    .max(25)
    .regex(/^[+\d\s-]*$/),
});
export const demoPaymentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().regex(/^\d{10}$/, "Saisis 10 chiffres pour cette maquette."),
});
