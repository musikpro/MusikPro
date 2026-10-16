/**
 * Catalogues quasi statiques lus à chaque requête par l'accueil et le tableau de bord (styles musicaux, occasions,
 * langues) : mis en cache dans le Data Cache de Next, invalidés par tag après chaque écriture admin.
 */
export const CATALOG_TAGS = {
  musicStyles: "catalog:music-styles",
  occasions: "catalog:occasions",
  languages: "catalog:languages",
} as const;

export type CatalogName = keyof typeof CATALOG_TAGS;

/**
 * Durée de vie de secours : l'invalidation par tag est la voie normale, ceci garantit qu'une écriture directe en base
 * (seed, migration, requête manuelle) finit par apparaître sans redéploiement.
 */
export const CATALOG_CACHE_TTL_SECONDS = 600;
