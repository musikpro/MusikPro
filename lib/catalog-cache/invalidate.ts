import "server-only";

import { revalidateTag } from "next/cache";
import { CATALOG_TAGS, type CatalogName } from "./tags";

/**
 * À appeler après TOUTE écriture dans un catalogue (créer, modifier, activer, réordonner, supprimer, traduire).
 * Expiration immédiate : la lecture suivante recharge depuis la base. Un test (tests/catalog-cache-invalidation.test.ts)
 * échoue si un fichier écrit dans ces tables sans appeler cette fonction.
 */
export function invalidateCatalogs(...names: CatalogName[]): void {
  for (const name of names) revalidateTag(CATALOG_TAGS[name], { expire: 0 });
}
