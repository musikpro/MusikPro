import { z } from "zod";

const words = (limit: number) => (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length <= limit;
export const demoStorySchema = z
  .string()
  .trim()
  .min(10, "Raconte ton histoire en au moins 10 caractères.")
  .max(1000);
export const demoLyricsSchema = z
  .string()
  .trim()
  .min(1, "Ajoute des paroles.")
  .max(12000)
  .refine(words(500), "Maximum 500 mots.");
export const demoDetailSchema = z
  .string()
  .max(3000)
  .refine(words(50), "Maximum 50 mots.");
export const demoProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  location: z.string().trim().min(2).max(150),
});
export const demoSupportSchema = z.object({
  subject: z.string().trim().min(2).max(150),
  category: z.enum(["Problème technique", "Compte", "Crédits"]),
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
  phone: z
    .string()
    .regex(/^\d{10}$/, "Saisis 10 chiffres pour cette maquette."),
});
