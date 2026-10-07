"use client";

import { useDemo } from "./DemoProvider";
import InstallAppCta, { useHideStoreButtons } from "./InstallAppCta";

export { useHideStoreButtons };

/**
 * Invitation à installer l'application Android : carte du tableau de bord client (`compact` pour la colonne latérale
 * du bureau). Le lien vient des réglages du propriétaire (`/admin/mobile-apps`), avec repli sur la page /download.
 */
export default function StoreDownloadCard({ compact = false }: { compact?: boolean }) {
  const demo = useDemo();
  return <InstallAppCta variant={compact ? "compact" : "card"} links={demo.storeLinks} />;
}
