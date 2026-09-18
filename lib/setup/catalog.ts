import countries from "@/config/countries.json";
import providers from "@/config/providers.json";

export type CountryCode = keyof typeof countries;
export type ProviderKey = keyof typeof providers;

export const countryCatalog = countries;
export const providerCatalog = providers;

export const blockedReadiness = new Set(["scaffold", "merchant-validation"]);

export function safeProvidersForCountry(country: CountryCode) {
  return countries[country].recommendedProviders.filter((provider) => {
    const item = providers[provider as ProviderKey];
    return item && !blockedReadiness.has(item.readiness);
  });
}
