import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(256);
export const totpCodeSchema = z.string().trim().regex(/^\d{6}$/);

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2).max(120) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema, token: z.string().min(1).max(4096) });
export const twoFactorCodeSchema = z.object({ code: totpCodeSchema });
export const twoFactorEnableSchema = z.object({ password: passwordSchema });
export const ownerTwoFactorContextSchema = z.object({
  email: z.string().min(3).max(320),
  expiresAt: z.string().datetime(),
  methods: z.array(z.enum(["otp", "totp"])).min(1),
});
