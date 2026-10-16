import "server-only";

import { unstable_cache } from "next/cache";
import { CATALOG_CACHE_TTL_SECONDS, CATALOG_TAGS, type CatalogName } from "./tags";

/**
 * Exécute `loader` à travers le Data Cache, sous le tag du catalogue. Le chargeur doit LEVER en cas d'erreur de base
 * (jamais renvoyer une valeur de secours) : Next ne met pas en cache une exécution qui lève, donc une panne passagère
 * n'est pas figée ; c'est l'appelant qui applique sa valeur de secours, hors cache. La clé est fixe (aucune entrée
 * utilisateur) : pas d'empoisonnement de cache possible.
 */
export function cachedCatalog<T>(name: CatalogName, loader: () => Promise<T>): Promise<T> {
  const tag = CATALOG_TAGS[name];
  return unstable_cache(loader, [tag], { tags: [tag], revalidate: CATALOG_CACHE_TTL_SECONDS })();
}
