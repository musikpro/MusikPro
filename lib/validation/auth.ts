import { z } from "zod";
import { i18nKey } from "@/lib/i18n/key";

export const emailSchema = z.string().trim().toLowerCase().email(i18nKey("Saisissez une adresse e-mail valide.")).max(254);
export const passwordSchema = z.string().min(10, i18nKey("Le mot de passe doit contenir au moins 10 caractères.")).max(256);
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, i18nKey("Saisissez le code à 6 chiffres."));

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, i18nKey("Indiquez votre nom (2 caractères minimum).")).max(120, i18nKey("Votre nom est trop long.")) });
export const registerIdentitySchema = registerSchema.pick({ name: true, email: true });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema, token: z.string().min(1).max(4096) });
export const twoFactorCodeSchema = z.object({ code: totpCodeSchema });
export const twoFactorEnableSchema = z.object({ password: passwordSchema });
export const ownerTwoFactorContextSchema = z.object({
  email: z.string().min(3).max(320),
  expiresAt: z.string().datetime(),
  methods: z.array(z.enum(["otp", "totp"])).min(1),
});
