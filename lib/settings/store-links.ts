import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileStoreLinks } from "@/db/schema";

export type StoreLinksStatus = { googlePlayUrl: string | null; appStoreUrl: string | null };

const EMPTY: StoreLinksStatus = { googlePlayUrl: null, appStoreUrl: null };

/** Réglage global unique : liens Google Play / App Store affichés dans la boîte "Télécharger l'application" du tableau de bord client. */
export async function getStoreLinks(): Promise<StoreLinksStatus> {
  try {
    const [row] = await db
      .select({ googlePlayUrl: mobileStoreLinks.googlePlayUrl, appStoreUrl: mobileStoreLinks.appStoreUrl })
      .from(mobileStoreLinks)
      .where(eq(mobileStoreLinks.id, "global"))
      .limit(1);
    if (!row) return EMPTY;
    return { googlePlayUrl: row.googlePlayUrl, appStoreUrl: row.appStoreUrl };
  } catch {
    return EMPTY;
  }
}
