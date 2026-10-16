import * as Sentry from "@sentry/nextjs";

// Sentry est optionnel : sans SENTRY_DSN, le SDK reste inactif et le SaaS fonctionne normalement.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
