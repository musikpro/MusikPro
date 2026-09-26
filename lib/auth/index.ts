import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, captcha, organization, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendAuthEmail, sendTwoFactorEmail } from "@/lib/email";
import { ownerTwoFactor, ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { assertServerOnlyEnv, requireEnv } from "@/lib/security/env";

assertServerOnlyEnv();

const emailPasswordEnabled = process.env.AUTH_EMAIL_PASSWORD_ENABLED !== "false";
const requireEmailVerification =
  emailPasswordEnabled &&
  (process.env.NODE_ENV === "production"
    ? process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false"
    : process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true");

export const auth = betterAuth({
  appName: process.env.APP_NAME ?? "Africa SaaS Kit",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  onAPIError: {
    errorURL: "/login",
  },
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
          },
        }
      : undefined,
  emailAndPassword: {
    enabled: emailPasswordEnabled,
    requireEmailVerification,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Réinitialiser votre mot de passe",
        title: "Réinitialisation du mot de passe",
        actionUrl: url,
        actionLabel: "Choisir un nouveau mot de passe",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: requireEmailVerification,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Vérifiez votre adresse e-mail",
        title: "Confirmez votre adresse e-mail",
        actionUrl: url,
        actionLabel: "Vérifier mon e-mail",
      });
    },
  },
  plugins: [
    organization({ teams: { enabled: true } }),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    ...(ownerTwoFactorEnabled()
      ? [
          ownerTwoFactor(),
          twoFactor({
            issuer: process.env.APP_NAME ?? "Africa SaaS Kit",
            twoFactorCookieMaxAge: 600,
            otpOptions: {
              digits: 6,
              period: 5,
              allowedAttempts: 5,
              storeOTP: "hashed",
              sendOTP: async ({ user, otp }) => {
                await sendTwoFactorEmail({ to: user.email, code: otp });
              },
            },
          }),
        ]
      : []),
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
          }),
        ]
      : []),
    nextCookies(),
  ],
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/two-factor/*": { window: 60, max: 5 },
    },
  },
});
