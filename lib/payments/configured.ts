import providerCatalog from "@/config/providers.json";
import type { PaymentProviderId } from "./types";

export function providerEnvironmentConfigured(provider: PaymentProviderId): boolean {
  const entry = providerCatalog[provider as keyof typeof providerCatalog] as { env?: string[] } | undefined;
  if (!entry?.env?.length) return false;
  return entry.env.every((name) => Boolean(process.env[name]?.trim()));
}
