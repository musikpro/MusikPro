"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import {
  paymentCountryRoutes,
  paymentProviderConfigs,
  planProviderMappings,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { providerCapabilities } from "@/lib/payments/capabilities";
import type { PaymentProviderId } from "@/lib/payments/types";
import { writeAuditLog } from "@/lib/security/audit";
import { encryptSecret } from "@/lib/ai/secrets";
import type { ChariowStoredConfig } from "@/lib/payments/chariow-config";

const providerIds = Object.keys(providerCapabilities) as [
  PaymentProviderId,
  ...PaymentProviderId[],
];
const providerSchema = z.object({
  provider: z.enum(providerIds),
  enabled: z.boolean(),
  priority: z.coerce.number().int().min(1).max(999),
  mode: z.enum(["sandbox", "live"]),
});
const routeSchema = z.object({
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  provider: z.enum(providerIds),
  enabled: z.boolean(),
  priority: z.coerce.number().int().min(1).max(999),
  methods: z.array(z.string().trim().min(1).max(40)).max(30),
  currencies: z
    .array(
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/),
    )
    .max(20),
});
const mappingSchema = z.object({
  planId: z.string().min(1).max(120),
  provider: z.literal("chariow"),
  productName: z.string().trim().min(2).max(120),
  externalProductId: z.string().trim().min(2).max(200),
});

export async function saveProvider(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = providerSchema.parse({
    provider: String(formData.get("provider") || ""),
    enabled: formData.get("enabled") === "on",
    priority: formData.get("priority") || 100,
    mode: String(formData.get("mode") || "sandbox"),
  });
  const capability = providerCapabilities[parsed.provider];
  if (
    parsed.enabled &&
    ["scaffold", "merchant-validation"].includes(capability.readiness)
  )
    throw new Error(
      "This adapter cannot be enabled until its merchant integration is validated",
    );
  if (
    parsed.enabled &&
    parsed.mode === "live" &&
    capability.readiness === "beta"
  )
    throw new Error(
      "Beta providers are sandbox-only until merchant validation is complete",
    );
  await db
    .insert(paymentProviderConfigs)
    .values({ id: randomUUID(), ...parsed })
    .onConflictDoUpdate({
      target: paymentProviderConfigs.provider,
      set: {
        enabled: parsed.enabled,
        priority: parsed.priority,
        mode: parsed.mode,
        updatedAt: new Date(),
      },
    });
  await writeAuditLog({
    action: "payment.provider.config.updated",
    actorId: session.user.id,
    targetType: "payment_provider",
    targetId: parsed.provider,
    metadata: {
      enabled: parsed.enabled,
      priority: parsed.priority,
      mode: parsed.mode,
    },
  });
  revalidatePath("/admin/payment-providers");
}

const chariowSchema = z.object({
  enabled: z.boolean(),
  priority: z.coerce.number().int().min(1).max(999),
  mode: z.enum(["sandbox", "live"]),
  apiKey: z.string().trim().max(500),
  webhookSecret: z.string().trim().max(500),
});

export async function saveChariowProvider(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = chariowSchema.parse({
    enabled: formData.get("enabled") === "on",
    priority: formData.get("priority") || 10,
    mode: String(formData.get("mode") || "live"),
    apiKey: String(formData.get("apiKey") || ""),
    webhookSecret: String(formData.get("webhookSecret") || ""),
  });
  const [existing] = await db
    .select()
    .from(paymentProviderConfigs)
    .where(eq(paymentProviderConfigs.provider, "chariow"))
    .limit(1);
  const previous = (existing?.config || {}) as ChariowStoredConfig;
  const webhookSecret = parsed.webhookSecret || (!previous.webhookSecret ? randomBytes(32).toString("hex") : "");
  const config: ChariowStoredConfig = {
    apiKey: parsed.apiKey
      ? { ...encryptSecret(parsed.apiKey), last4: parsed.apiKey.slice(-4) }
      : previous.apiKey,
    webhookSecret: webhookSecret
      ? { ...encryptSecret(webhookSecret), last4: webhookSecret.slice(-4) }
      : previous.webhookSecret,
  };
  if (parsed.enabled && !config.apiKey)
    throw new Error("Ajoute la clé API Chariow avant d'activer la passerelle.");
  await db
    .insert(paymentProviderConfigs)
    .values({
      id: existing?.id || randomUUID(),
      provider: "chariow",
      enabled: parsed.enabled,
      priority: parsed.priority,
      mode: parsed.mode,
      config,
    })
    .onConflictDoUpdate({
      target: paymentProviderConfigs.provider,
      set: { enabled: parsed.enabled, priority: parsed.priority, mode: parsed.mode, config, updatedAt: new Date() },
    });
  await writeAuditLog({
    action: "payment.provider.config.updated",
    actorId: session.user.id,
    targetType: "payment_provider",
    targetId: "chariow",
    metadata: { enabled: parsed.enabled, priority: parsed.priority, mode: parsed.mode, apiKeyUpdated: Boolean(parsed.apiKey) },
  });
  revalidatePath("/admin/payment-providers");
  revalidatePath("/admin/payment-providers/chariow");
}

export async function saveCountryRoute(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const methods = String(formData.get("methods") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const currencies = String(formData.get("currencies") || "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  const parsed = routeSchema.parse({
    country: String(formData.get("country") || ""),
    provider: String(formData.get("provider") || ""),
    enabled: formData.get("enabled") === "on",
    priority: formData.get("priority") || 100,
    methods,
    currencies,
  });
  if (
    ["scaffold", "merchant-validation"].includes(
      providerCapabilities[parsed.provider].readiness,
    )
  )
    throw new Error(
      "This adapter cannot be routed until merchant validation is complete",
    );
  await db
    .insert(paymentCountryRoutes)
    .values({ id: randomUUID(), ...parsed })
    .onConflictDoUpdate({
      target: [paymentCountryRoutes.country, paymentCountryRoutes.provider],
      set: {
        enabled: parsed.enabled,
        priority: parsed.priority,
        methods: parsed.methods,
        currencies: parsed.currencies,
        updatedAt: new Date(),
      },
    });
  await writeAuditLog({
    action: "payment.country_route.updated",
    actorId: session.user.id,
    targetType: "payment_route",
    targetId: `${parsed.country}:${parsed.provider}`,
    metadata: {
      enabled: parsed.enabled,
      priority: parsed.priority,
      methods: parsed.methods,
      currencies: parsed.currencies,
    },
  });
  revalidatePath("/admin/payment-providers");
}

export async function savePlanMapping(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = mappingSchema.parse({
    planId: String(formData.get("planId") || ""),
    provider: String(formData.get("provider") || ""),
    productName: String(formData.get("productName") || ""),
    externalProductId: String(formData.get("externalProductId") || ""),
  });
  await db
    .insert(planProviderMappings)
    .values({
      id: randomUUID(),
      planId: parsed.planId,
      provider: parsed.provider,
      externalProductId: parsed.externalProductId,
      metadata: { productName: parsed.productName },
    })
    .onConflictDoUpdate({
      target: [planProviderMappings.planId, planProviderMappings.provider],
      set: {
        externalProductId: parsed.externalProductId,
        metadata: { productName: parsed.productName },
        updatedAt: new Date(),
      },
    });
  await writeAuditLog({
    action: "payment.plan_mapping.updated",
    actorId: session.user.id,
    targetType: "plan",
    targetId: parsed.planId,
    metadata: {
      provider: parsed.provider,
      productName: parsed.productName,
      hasExternalProductId: true,
    },
  });
  revalidatePath("/admin/payment-providers");
  revalidatePath("/admin/payment-providers/chariow");
}

const deleteMappingSchema = z.object({
  planId: z.string().min(1).max(120),
  provider: z.literal("chariow"),
});

export async function deletePlanMapping(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = deleteMappingSchema.parse({
    planId: String(formData.get("planId") || ""),
    provider: String(formData.get("provider") || ""),
  });
  await db.delete(planProviderMappings).where(and(
    eq(planProviderMappings.planId, parsed.planId),
    eq(planProviderMappings.provider, parsed.provider),
  ));
  await writeAuditLog({
    action: "payment.plan_mapping.deleted",
    actorId: session.user.id,
    targetType: "plan",
    targetId: parsed.planId,
    metadata: { provider: parsed.provider },
  });
  revalidatePath("/admin/payment-providers");
  revalidatePath("/admin/payment-providers/chariow");
}
