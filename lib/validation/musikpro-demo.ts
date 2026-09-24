import { z } from "zod";
import { LYRICS_MAX_WORDS } from "@/lib/ai/lyrics-policy";

const words = (limit: number) => (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= limit;
export const DEMO_LYRICS_MAX_WORDS = LYRICS_MAX_WORDS;
export const DEMO_LYRICS_MAX_CHARACTERS = 18000;
export const DEMO_STORY_MAX_WORDS = 120;
export const DEMO_STORY_MAX_CHARACTERS = 1200;
export const demoCreationChoicesSchema = z.object({
  occasion: z.string().max(80),
  genre: z.string().max(80),
  mood: z.string().max(80),
  language: z.string().max(80),
  voice: z.string().max(80),
  recipientRelation: z.string().max(100),
});
export const DEMO_PHONE_RULES = {
  CI: { digits: 10, placeholder: "0708807015" },
  SN: { digits: 9, placeholder: "771234567" },
  ML: { digits: 8, placeholder: "70123456" },
  BF: { digits: 8, placeholder: "70123456" },
  NE: { digits: 8, placeholder: "90123456" },
  GH: { digits: 9, placeholder: "241234567" },
  NG: { digits: 10, placeholder: "8012345678" },
  FR: { digits: 9, placeholder: "612345678" },
} as const;

export type DemoPhoneCountry = keyof typeof DEMO_PHONE_RULES;
export const demoStorySchema = z
  .string()
  .trim()
  .min(10, "Raconte ton histoire en au moins 10 caractères.")
  .max(DEMO_STORY_MAX_CHARACTERS)
  .refine(words(DEMO_STORY_MAX_WORDS), `Maximum ${DEMO_STORY_MAX_WORDS} mots.`);
export const demoRecipientSchema = z.object({
  name: z.string().trim().min(2, "Indique le nom de la personne concernée.").max(100),
  pronunciation: z.string().trim().min(2, "Vérifie la prononciation suggérée.").max(160),
  // The set of valid values is admin-managed (see lib/recipient-relations) rather than fixed here,
  // so this only bounds length/emptiness — the select already constrains the choice client-side.
  relation: z.string().trim().min(1, "Choisis à qui la chanson est destinée.").max(100),
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
  subject: z.string().trim().min(2).max(150).refine((value) => !/[\r\n]/.test(value), "Sujet invalide."),
  category: z.enum(["Problème technique", "Compte", "Crédits"]),
  message: z.string().trim().min(10).max(5000),
  email: z.email().max(254),
  phone: z
    .string()
    .max(25)
    .regex(/^[+\d\s-]*$/),
});
export const demoPaymentDraftSchema = z.object({
  name: z.string().trim().max(100).catch(""),
  email: z.string().trim().max(254).catch(""),
  phone: z.string().trim().max(25).regex(/^\d*$/).catch(""),
  phoneCountry: z.enum(Object.keys(DEMO_PHONE_RULES) as [DemoPhoneCountry, ...DemoPhoneCountry[]]).catch("CI"),
});
export const demoPaymentSchema = z
  .object({
    name: z.string().trim().min(2, "Indique ton nom complet.").max(100),
    email: z.email("Saisis une adresse e-mail valide.").max(254),
    phoneCountry: z.enum(Object.keys(DEMO_PHONE_RULES) as [DemoPhoneCountry, ...DemoPhoneCountry[]]),
    phone: z.string().regex(/^\d*$/, "Utilise uniquement des chiffres."),
  })
  .superRefine(({ phoneCountry, phone }, context) => {
    const requiredDigits = DEMO_PHONE_RULES[phoneCountry].digits;
    if (phone.length !== requiredDigits) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: `Saisis exactement ${requiredDigits} chiffres pour cet indicatif.`,
      });
    }
  });
