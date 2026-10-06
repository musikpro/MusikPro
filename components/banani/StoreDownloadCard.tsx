"use client";

import { useDemo } from "./DemoProvider";
import InstallAppCta, { useHideStoreButtons } from "./InstallAppCta";

export { useHideStoreButtons };

/**
 * Invitation à installer l'application (remplace les anciens badges Google Play / App Store) : carte du tableau de
 * bord client (`compact` pour la colonne latérale du bureau) et bande du menu mobile. Les liens viennent des réglages
 * du propriétaire (`/admin/mobile-apps`), avec repli sur la page /download.
 */
export function StoreBadges({ className = "" }: { className?: string }) {
  const demo = useDemo();
  return <InstallAppCta variant="strip" links={demo.storeLinks} className={className} />;
}

export default function StoreDownloadCard({ compact = false }: { compact?: boolean }) {
  const demo = useDemo();
  return <InstallAppCta variant={compact ? "compact" : "card"} links={demo.storeLinks} />;
}
