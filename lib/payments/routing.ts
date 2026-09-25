import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { paymentAttempts, paymentCountryRoutes, paymentProviderConfigs } from "@/db/schema";
import { providerCapabilities, providerRuntimeAllowed } from "./capabilities";
import type { PaymentProviderId } from "./types";
import { providerEnvironmentConfigured } from "./configured";
import { providerIsDegraded } from "./health";
import { chariowIsConfigured } from "./chariow-config";

// MusikPro currently exposes one checkout provider. The registry and adapter
// contract stay provider-agnostic so another gateway can be added later.
const activeProviders: PaymentProviderId[] = ["chariow"];

export type RankedProvider = {
  provider: PaymentProviderId;
  score: number;
  priority: number;
  successRate: number | null;
  recentAttempts: number;
  degraded: boolean;
  degradedWindowAttempts: number;
  degradedWindowSuccessRate: number | null;
};

function listMatches(values: unknown, value?: string) {
  if (!value) return true;
  if (!Array.isArray(values) || values.length === 0) return true;
  return values
    .map(String)
    .map((v) => v.toUpperCase())
    .includes(value.toUpperCase());
}

function methodMatches(methods: unknown, method?: string) {
  return listMatches(methods, method);
}

function currencyMatches(currencies: unknown, currency?: string) {
  return listMatches(currencies, currency);
}

export async function availableProviders(
  country?: string,
  method?: string,
  currency?: string,
): Promise<PaymentProviderId[]> {
  const chariowReady = await chariowIsConfigured();
  if (!chariowReady) return [];
  const cc = country?.toUpperCase();
  const allConfigs = await db.select().from(paymentProviderConfigs);
  const hasAdminConfig = allConfigs.length > 0;
  const enabled = new Set(allConfigs.filter((c) => c.enabled).map((c) => c.provider));

  if (!cc) {
    const fallback = "chariow" as PaymentProviderId;
    const candidates = !hasAdminConfig || enabled.has(fallback) ? [fallback] : ([...enabled] as PaymentProviderId[]);
    return candidates.filter((p) => {
      const capability = providerCapabilities[p];
      return (
        activeProviders.includes(p) &&
        Boolean(capability) &&
        !["scaffold", "merchant-validation"].includes(capability.readiness) &&
        providerRuntimeAllowed(p) &&
        (p === "chariow" || providerEnvironmentConfigured(p))
      );
    });
  }

  const rows = await db
    .select()
    .from(paymentCountryRoutes)
    .where(and(eq(paymentCountryRoutes.country, cc), eq(paymentCountryRoutes.enabled, true)))
    .orderBy(asc(paymentCountryRoutes.priority));

  if (rows.length) {
    return rows
      .filter((r) => methodMatches(r.methods, method) && currencyMatches(r.currencies, currency))
      .map((r) => r.provider as PaymentProviderId)
      .filter(
        (p) =>
          activeProviders.includes(p) &&
          (!hasAdminConfig || enabled.has(p)) &&
          providerCapabilities[p]?.readiness !== "scaffold" &&
          providerCapabilities[p]?.readiness !== "merchant-validation" &&
          providerRuntimeAllowed(p) &&
          (p === "chariow" || providerEnvironmentConfigured(p)),
      );
  }

  return activeProviders.filter(
    (p) =>
      (!hasAdminConfig || enabled.has(p)) &&
      providerCapabilities[p]?.readiness !== "scaffold" &&
      providerCapabilities[p]?.readiness !== "merchant-validation" &&
      providerRuntimeAllowed(p),
  );
}

export async function rankProviders(country?: string, method?: string, currency?: string): Promise<RankedProvider[]> {
  const providers = await availableProviders(country, method, currency);
  if (!providers.length) return [];

  const cc = country?.toUpperCase();
  const routeRows = cc
    ? await db
        .select()
        .from(paymentCountryRoutes)
        .where(and(eq(paymentCountryRoutes.country, cc), inArray(paymentCountryRoutes.provider, providers)))
    : [];
  const routePriority = new Map(routeRows.map((r) => [r.provider, r.priority]));

  const now = Date.now();
  const since = new Date(now - 24 * 60 * 60 * 1000);
  const degradedSince = new Date(now - 10 * 60 * 1000);
  const attempts = await db
    .select()
    .from(paymentAttempts)
    .where(and(inArray(paymentAttempts.provider, providers), gte(paymentAttempts.createdAt, since)))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(500);

  return providers
    .map((provider, index) => {
      const recent = attempts.filter(
        (a) =>
          a.provider === provider &&
          (!cc || a.country === cc) &&
          (!method || a.method === method) &&
          ["checkout_created", "provider_error"].includes(a.outcome),
      );
      const successes = recent.filter((a) => a.outcome === "checkout_created").length;
      const successRate = recent.length ? successes / recent.length : null;
      const recentWindow = recent.filter((a) => a.createdAt >= degradedSince);
      const recentWindowSuccesses = recentWindow.filter((a) => a.outcome === "checkout_created").length;
      const degradedWindowSuccessRate = recentWindow.length ? recentWindowSuccesses / recentWindow.length : null;
      // Distributed circuit-breaker style guard: use DB-backed attempts so serverless instances agree.
      // A provider becomes degraded only with a meaningful sample; one or two transient failures never trip it.
      const degraded = providerIsDegraded(recentWindow.map((a) => a.outcome));
      const priority = routePriority.get(provider) ?? (index + 1) * 100;
      // Priority dominates under normal conditions; a degraded provider is pushed out of automatic selection.
      const healthPenalty = successRate == null ? 0 : Math.round((1 - successRate) * 80);
      const lowSamplePenalty = recent.length > 0 && recent.length < 3 && successes === 0 ? 25 : 0;
      const degradedPenalty = degraded ? 10_000 : 0;
      return {
        provider,
        priority,
        successRate,
        recentAttempts: recent.length,
        degraded,
        degradedWindowAttempts: recentWindow.length,
        degradedWindowSuccessRate,
        score: priority + healthPenalty + lowSamplePenalty + degradedPenalty,
      };
    })
    .sort((a, b) => a.score - b.score);
}

export async function resolveProvider(
  country: string | undefined,
  requested?: PaymentProviderId,
  method?: string,
  currency?: string,
) {
  const list = await rankProviders(country, method, currency);
  if (requested) {
    const match = list.find((x) => x.provider === requested);
    if (match) return requested;
    throw new Error(
      `Provider ${requested} is not enabled for ${country || "this checkout"}${method ? ` / ${method}` : ""}`,
    );
  }
  const selected = list[0]?.provider;
  if (!selected) throw new Error(`No enabled payment provider for ${country || "this checkout"}`);
  return selected;
}
