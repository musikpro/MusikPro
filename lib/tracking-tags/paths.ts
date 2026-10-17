import { splitLocalePrefix } from "@/lib/languages/locale-path";

/** Zones où aucune balise « tout le site » n'est jamais insérée : administration, visite guidée, installation, API. */
const EXCLUDED_PREFIXES = ["/admin", "/demo", "/setup", "/api"] as const;

/** `true` pour une URL (avec ou sans préfixe de langue ni query) qui ne doit recevoir aucune balise de suivi globale. */
export function isTrackingExcludedPath(requestPath: string | null | undefined): boolean {
  const pathname = (requestPath ?? "").split("?")[0] || "/";
  const { path } = splitLocalePrefix(pathname);
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
