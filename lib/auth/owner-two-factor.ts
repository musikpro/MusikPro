import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { hasAppRole } from "@/lib/auth/permissions";

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

export function shouldBootstrapOwnerTwoFactor(
  user: { role?: string | null; twoFactorEnabled?: boolean | null },
  enabled = ownerTwoFactorEnabled(),
) {
  return enabled && hasAppRole(user.role, "admin") && user.twoFactorEnabled !== true;
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
          if (!user || !hasAppRole(ownerRole, "admin")) {
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
            methods: totpRecord && totpRecord.verified !== false ? ["otp", "totp"] : ["otp"],
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
            if (!session || !hasAppRole(session.user.role as string | undefined, "admin")) {
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
            if (!shouldBootstrapOwnerTwoFactor(owner)) return;

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
      ],
    },
  };
}
