import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, captcha, organization, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendAuthEmail, sendTwoFactorEmail } from "@/lib/email";
import { authEmailText, localeFromRequest, type AuthEmailKind } from "@/lib/email/auth-email-text";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { ownerTwoFactor, ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { assertServerOnlyEnv, requireEnv } from "@/lib/security/env";

assertServerOnlyEnv();

const emailPasswordEnabled = process.env.AUTH_EMAIL_PASSWORD_ENABLED !== "false";
const requireEmailVerification =
  emailPasswordEnabled &&
  (process.env.NODE_ENV === "production"
    ? process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false"
    : process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true");

/** Textes de l'e-mail dans la langue de la requête ; une panne de traduction ne doit jamais empêcher l'envoi. */
async function localizedAuthEmail(kind: AuthEmailKind, request: Request | undefined) {
  let locale = localeFromRequest(request);
  try {
    await primeOverlay(locale);
  } catch {
    locale = "fr";
  }
  return authEmailText(kind, locale);
}

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
  // Les jetons OAuth (accès, rafraîchissement, identité) sont chiffrés avant d'être écrits dans `account`. Les lignes
  // déjà stockées en clair restent lisibles (Better Auth ne déchiffre que ce qui a l'air chiffré) ; elles sont
  // chiffrées à la prochaine connexion. Le chiffrement dérive de BETTER_AUTH_SECRET.
  account: { encryptOAuthTokens: true },
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
    sendResetPassword: async ({ user, url }, request) => {
      await sendAuthEmail({ to: user.email, actionUrl: url, ...(await localizedAuthEmail("reset", request)) });
    },
  },
  emailVerification: {
    sendOnSignUp: requireEmailVerification,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendAuthEmail({ to: user.email, actionUrl: url, ...(await localizedAuthEmail("verify", request)) });
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
