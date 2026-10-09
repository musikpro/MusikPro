import { z } from "zod";
import { LYRICS_MAX_WORDS } from "@/lib/ai/lyrics-policy";
import { i18nKey } from "@/lib/i18n/key";

const words = (limit: number) => (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= limit;
export const DEMO_LYRICS_MAX_WORDS = LYRICS_MAX_WORDS;
export const DEMO_LYRICS_MAX_CHARACTERS = 18000;
/** Character (not word) limits for the two free-text creation fields — one source of truth shared by
 * the inputs, their counters, the client schemas below and the server-side lyrics schema. */
export const DEMO_STORY_MAX_CHARACTERS = 600;
export const DEMO_DETAIL_MAX_CHARACTERS = 250;
export const demoCreationChoicesSchema = z.object({
  occasion: z.string().max(80),
  genre: z.string().max(80),
  mood: z.string().max(80),
  language: z.string().max(80),
  voice: z.string().max(80),
  recipientRelation: z.string().max(100),
});
export type PhoneRule = { countryCode: string; digits: number; placeholder: string };

/** Resolves a chosen country code against the live prefix list, falling back to the first
 * available prefix if the choice is stale (deactivated/deleted) or unset — so the checkout
 * screen never submits a `phoneCountry` that doesn't exist in `prefixes`. */
export function resolvePhoneCountry(choice: string, prefixes: PhoneRule[]): string {
  return prefixes.some((prefix) => prefix.countryCode === choice) ? choice : (prefixes[0]?.countryCode ?? "");
}

/** Indicatif proposé au départ : le pays détecté s'il a un préfixe actif, sinon le repli (« CI » historique). */
export function pickInitialPhoneCountry(
  detectedCountry: string | null | undefined,
  prefixes: Pick<PhoneRule, "countryCode">[],
  fallback = "CI",
): string {
  const detected = (detectedCountry ?? "").trim().toUpperCase();
  return detected && prefixes.some((prefix) => prefix.countryCode === detected) ? detected : fallback;
}

export function buildDemoPaymentDraftSchema(prefixes: PhoneRule[]) {
  const codes = new Set(prefixes.map((p) => p.countryCode));
  const fallback = prefixes[0]?.countryCode ?? "";
  return z.object({
    name: z.string().trim().max(100).catch(""),
    email: z.string().trim().max(254).catch(""),
    phone: z.string().trim().max(25).regex(/^\d*$/).catch(""),
    phoneCountry: z
      .string()
      .catch(fallback)
      .transform((value) => (codes.has(value) ? value : fallback)),
    /** Vrai quand le client a lui-même choisi l'indicatif : un choix manuel prime sur la détection du pays. */
    phoneCountryChosen: z.boolean().optional().catch(undefined),
  });
}

export function buildDemoPaymentSchema(prefixes: PhoneRule[]) {
  const rules = new Map(prefixes.map((p) => [p.countryCode, p]));
  return z
    .object({
      name: z.string().trim().min(2, i18nKey("Indique ton nom complet.")).max(100),
      email: z.email(i18nKey("Saisis une adresse e-mail valide.")).max(254),
      phoneCountry: z.string().min(2).max(4),
      phone: z.string().regex(/^\d*$/, i18nKey("Utilise uniquement des chiffres.")),
    })
    .superRefine(({ phoneCountry, phone }, context) => {
      const rule = rules.get(phoneCountry);
      if (!rule) {
        context.addIssue({
          code: "custom",
          path: ["phoneCountry"],
          message: i18nKey("Indicatif téléphonique invalide."),
        });
        return;
      }
      if (phone.length !== rule.digits) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: `Saisis exactement ${rule.digits} chiffres pour cet indicatif.`,
        });
      }
    });
}
export const demoStorySchema = z
  .string()
  .trim()
  .min(10, i18nKey("Raconte ton histoire en au moins 10 caractères."))
  .max(DEMO_STORY_MAX_CHARACTERS, `Maximum ${DEMO_STORY_MAX_CHARACTERS} caractères.`);
export const demoRecipientSchema = z.object({
  name: z.string().trim().min(2, i18nKey("Indique le nom de la personne concernée.")).max(100),
  pronunciation: z.string().trim().min(2, i18nKey("Vérifie la prononciation suggérée.")).max(160),
  // The set of valid values is admin-managed (see lib/recipient-relations) rather than fixed here,
  // so this only bounds length/emptiness — the select already constrains the choice client-side.
  relation: z.string().trim().min(1, i18nKey("Choisis à qui la chanson est destinée.")).max(100),
});
export const demoSenderSchema = z.object({
  name: z.string().trim().min(2, i18nKey("Indique ton nom (l'expéditeur de la chanson).")).max(100),
  pronunciation: z.string().trim().min(2, i18nKey("Vérifie la prononciation suggérée.")).max(160),
});
export const demoLyricsSchema = z
  .string()
  .trim()
  .min(1, i18nKey("Ajoute des paroles."))
  .max(DEMO_LYRICS_MAX_CHARACTERS)
  .refine(words(DEMO_LYRICS_MAX_WORDS), `Maximum ${DEMO_LYRICS_MAX_WORDS} mots.`);
export const demoDetailSchema = z
  .string()
  .max(DEMO_DETAIL_MAX_CHARACTERS, `Maximum ${DEMO_DETAIL_MAX_CHARACTERS} caractères.`);
export const demoProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  location: z.string().trim().min(2).max(150),
});
export const demoSupportSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .refine((value) => !/[\r\n]/.test(value), i18nKey("Sujet invalide.")),
  category: z.enum(["Problème technique", "Compte", "Crédits"]),
  message: z.string().trim().min(10).max(5000),
  email: z.email().max(254),
  phone: z
    .string()
    .max(25)
    .regex(/^[+\d\s-]*$/),
});
