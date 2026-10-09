import { z } from "zod";
import { i18nKey } from "@/lib/i18n/key";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email(i18nKey("Saisissez une adresse e-mail valide."))
  .max(254);
export const passwordSchema = z
  .string()
  .min(10, i18nKey("Le mot de passe doit contenir au moins 10 caractères."))
  .max(256);
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, i18nKey("Saisissez le code à 6 chiffres."));

/** Code de secours Better Auth : 10 caractères alphanumériques séparés par un tiret (ex. abcde-12345). */
export const backupCodeSchema = z
  .string()
  .trim()
  .min(8, i18nKey("Saisissez un code de secours valide."))
  .max(24, i18nKey("Saisissez un code de secours valide."))
  .regex(/^[A-Za-z0-9-]+$/, i18nKey("Saisissez un code de secours valide."));

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
// Autorise lettres accentuées, chiffres, espaces et ponctuation usuelle d'un nom ; interdit les délimiteurs de
// balisage (< >) et les caractères de contrôle — défense en profondeur si ce nom est un jour rendu via du HTML
// non échappé (export, e-mail, PDF…), en plus de l'échappement React déjà en place à l'affichage.
export const userNameSchema = z
  .string()
  .trim()
  .min(2, i18nKey("Indiquez votre nom (2 caractères minimum)."))
  .max(120, i18nKey("Votre nom est trop long."))
  .regex(/^[^\u0000-\u001F\u007F<>]*$/u, i18nKey("Le nom ne peut pas contenir les caractères < ou >."));
export const registerSchema = loginSchema.extend({ name: userNameSchema });
export const registerIdentitySchema = registerSchema.pick({ name: true, email: true });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema, token: z.string().min(1).max(4096) });
export const twoFactorCodeSchema = z.object({ code: totpCodeSchema });
export const twoFactorBackupCodeSchema = z.object({ code: backupCodeSchema });
export const twoFactorEnableSchema = z.object({ password: passwordSchema });
/** Mot de passe facultatif : un compte connecté uniquement par Google n'en a pas (Better Auth l'exige sinon). */
export const twoFactorOptionalPasswordSchema = z.object({
  password: z
    .string()
    .max(256, i18nKey("Mot de passe invalide"))
    .optional()
    .transform((value) => (value ? value : undefined)),
});
export const ownerTwoFactorContextSchema = z.object({
  email: z.string().min(3).max(320),
  expiresAt: z.string().datetime(),
  methods: z.array(z.enum(["otp", "totp", "backup"])).min(1),
});
