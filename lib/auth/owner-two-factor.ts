import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { isAdminRole } from "@/lib/auth/permissions";

const TWO_FACTOR_COOKIE_NAME = "two_factor";

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "••••••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function ownerTwoFactorEnabled(value = process.env.OWNER_2FA_ENABLED) {
  return value === "true";
}

/**
 * "Propriétaire" = tout compte d'administration : Super Admin, Admin Contenu/Paiements (financier),
 * Support, Modérateur et rôles personnalisés. Les clients (rôle "user") ne sont jamais concernés.
 */
export async function resolveOwnerSlugs(role: string | null | undefined) {
  // Loaded lazily: custom-roles opens the database, which pure helpers/tests here must not require.
  const { resolveExtraAdminSlugs } = await import("@/lib/auth/custom-roles");
  return resolveExtraAdminSlugs(role);
}

export async function isOwnerAccount(role: string | null | undefined) {
  return isAdminRole(role, await resolveOwnerSlugs(role));
}

export function shouldBootstrapOwnerTwoFactor(
  user: { role?: string | null; twoFactorEnabled?: boolean | null },
  enabled = ownerTwoFactorEnabled(),
  extraAdminSlugs: string[] = [],
) {
  return enabled && isAdminRole(user.role, extraAdminSlugs) && user.twoFactorEnabled !== true;
}

/** Connexion sociale (Google) : le plugin Better Auth ne pose le défi que pour l'e-mail et le mot de passe. */
export function isSocialSignInPath(path: string) {
  return path.startsWith("/callback/") || path.startsWith("/oauth2/callback/") || path === "/sign-in/social";
}

export function ownerTwoFactor(): BetterAuthPlugin {
  return {
    id: "owner-two-factor",
    endpoints: {
      ownerTwoFactorContext: createAuthEndpoint(
        "/two-factor/owner-context",
        { method: "GET", metadata: { noStore: true } },
        async (ctx) => {
          const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME);
          const identifier = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
          if (!identifier) {
            throw APIError.from("UNAUTHORIZED", {
              code: "INVALID_TWO_FACTOR_CHALLENGE",
              message: "La vérification a expiré. Reconnectez-vous.",
            });
          }

          const verification = await ctx.context.internalAdapter.findVerificationValue(identifier);
          if (!verification || verification.expiresAt <= new Date()) {
            throw APIError.from("UNAUTHORIZED", {
              code: "EXPIRED_TWO_FACTOR_CHALLENGE",
              message: "La vérification a expiré. Reconnectez-vous.",
            });
          }
          const user = await ctx.context.internalAdapter.findUserById(verification.value);
          const ownerRole = user ? (user as typeof user & { role?: string }).role : undefined;
          if (!user || !(await isOwnerAccount(ownerRole))) {
            throw APIError.from("FORBIDDEN", {
              code: "OWNER_TWO_FACTOR_ONLY",
              message: "Cette vérification est réservée aux propriétaires.",
            });
          }

          const totp = await ctx.context.adapter.findOne({
            model: "twoFactor",
            where: [{ field: "userId", value: user.id }],
          });
          const totpRecord = totp as { verified?: boolean } | null;
          return ctx.json({
            email: maskEmail(user.email),
            expiresAt: verification.expiresAt.toISOString(),
            methods: totpRecord && totpRecord.verified !== false ? ["totp", "otp", "backup"] : ["otp"],
          });
        },
      ),
    },
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/two-factor/enable" || ctx.path === "/two-factor/disable",
          handler: createAuthMiddleware(async (ctx) => {
            const session = await getSessionFromCtx(ctx);
            if (!session || !(await isOwnerAccount(session.user.role as string | undefined))) {
              throw APIError.from("FORBIDDEN", {
                code: "OWNER_TWO_FACTOR_ONLY",
                message: "Le double facteur est réservé aux propriétaires.",
              });
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === "/sign-in/email" || ctx.path === "/sign-in/username",
          handler: createAuthMiddleware(async (ctx) => {
            const current = ctx.context.newSession;
            if (!current) return;
            const owner = current.user as typeof current.user & {
              role?: string | null;
              twoFactorEnabled?: boolean | null;
            };
            if (!shouldBootstrapOwnerTwoFactor(owner, ownerTwoFactorEnabled(), await resolveOwnerSlugs(owner.role)))
              return;

            const updated = await ctx.context.internalAdapter.updateUser(owner.id, {
              twoFactorEnabled: true,
            });
            if (!updated) {
              throw APIError.from("INTERNAL_SERVER_ERROR", {
                code: "OWNER_TWO_FACTOR_BOOTSTRAP_FAILED",
                message: "Impossible de préparer la vérification du propriétaire.",
              });
            }
            ctx.context.setNewSession({
              session: current.session,
              user: { ...current.user, ...updated, twoFactorEnabled: true },
            });
          }),
        },
        {
          // Propriétaire qui entre avec Google : même second facteur que par mot de passe (application ou code e-mail).
          matcher: (ctx) => ownerTwoFactorEnabled() && isSocialSignInPath(ctx.path ?? ""),
          handler: createAuthMiddleware(async (ctx) => {
            const current = ctx.context.newSession;
            if (!current) return;
            const owner = current.user as typeof current.user & { role?: string | null };
            if (!(await isOwnerAccount(owner.role))) return;

            // Première connexion : le code e-mail sert de second facteur tant qu'aucune application n'est liée.
            await ctx.context.internalAdapter.updateUser(owner.id, { twoFactorEnabled: true });
            deleteSessionCookie(ctx, true);
            await ctx.context.internalAdapter.deleteSession(current.session.token);
            ctx.context.setNewSession(null);

            const maxAge = 600;
            const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, { maxAge });
            const identifier = `2fa-${generateRandomString(20)}`;
            const expiresAt = new Date(Date.now() + maxAge * 1000);
            await ctx.context.internalAdapter.createVerificationValue({ value: owner.id, identifier, expiresAt });
            await ctx.context.internalAdapter.createVerificationValue({
              value: "0",
              identifier: `2fa-attempts-${identifier}`,
              expiresAt,
            });
            await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes);

            const totp = await ctx.context.adapter.findOne({
              model: "twoFactor",
              where: [{ field: "userId", value: owner.id }],
            });
            const totpRecord = totp as { verified?: boolean } | null;
            const twoFactorMethods = totpRecord && totpRecord.verified !== false ? ["totp", "otp"] : ["otp"];
            if (ctx.path === "/sign-in/social") return ctx.json({ twoFactorRedirect: true, twoFactorMethods });
            throw ctx.redirect("/two-factor");
          }),
        },
      ],
    },
  };
}
