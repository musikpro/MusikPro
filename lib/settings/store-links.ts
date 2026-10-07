import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileStoreLinks } from "@/db/schema";
import { APK_DOWNLOAD_PATH } from "@/lib/app-releases/constants";
import { getPublishedRelease } from "@/lib/app-releases/server";

export type StoreLinksStatus = { googlePlayUrl: string | null; appStoreUrl: string | null; hideInApp: boolean };

// Par défaut (aucun réglage enregistré), les boutons sont masqués dans l'application native.
const EMPTY: StoreLinksStatus = { googlePlayUrl: null, appStoreUrl: null, hideInApp: true };

/** Réglage global unique : liens Google Play / App Store affichés dans la boîte "Télécharger l'application" du tableau de bord client. */
export async function getStoreLinks(): Promise<StoreLinksStatus> {
  try {
    const [row] = await db
      .select({
        googlePlayUrl: mobileStoreLinks.googlePlayUrl,
        appStoreUrl: mobileStoreLinks.appStoreUrl,
        hideInApp: mobileStoreLinks.hideInApp,
      })
      .from(mobileStoreLinks)
      .where(eq(mobileStoreLinks.id, "global"))
      .limit(1);
    if (!row) return EMPTY;
    return { googlePlayUrl: row.googlePlayUrl, appStoreUrl: row.appStoreUrl, hideInApp: row.hideInApp };
  } catch {
    return EMPTY;
  }
}

/**
 * Liens réellement proposés aux visiteurs (accueil, tableau de bord). Un lien de boutique configuré garde la priorité ;
 * sinon Google Play mène à la page /download#android (installation sans avertissement, puis APK en option) et
 * l'App Store à la page d'installation sur l'écran d'accueil (PWA). `getStoreLinks()` reste la valeur brute saisie par le propriétaire.
 */
export async function getEffectiveStoreLinks(): Promise<StoreLinksStatus> {
  const links = await getStoreLinks();
  // Fichier d'installation publié depuis l'admin : Google Play (Android) le télécharge directement.
  const apk = links.googlePlayUrl ? null : await getPublishedRelease("android").catch(() => null);
  return {
    ...links,
    googlePlayUrl: links.googlePlayUrl ?? (apk ? APK_DOWNLOAD_PATH : "/download#android"),
    appStoreUrl: links.appStoreUrl ?? "/download#iphone",
  };
}
