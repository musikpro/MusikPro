import "server-only";

import { count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { pushDevices } from "@/db/schema";
import type { AdminCatalogItem } from "@/components/admin/AdminCatalogPage";
import { isPushConfigured } from "@/lib/notifications/fcm";
import type { StoreLinksStatus } from "@/lib/settings/store-links";

async function countDevices(platform: string): Promise<number | null> {
  try {
    const [row] = await getServiceDb()
      .select({ total: count() })
      .from(pushDevices)
      .where(eq(pushDevices.platform, platform));
    return row?.total ?? 0;
  } catch {
    return null;
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Canaux de diffusion affichés dans /admin/mobile-apps, calculés à partir de l'état réel (liens de boutiques saisis,
 * appareils enregistrés pour les notifications, configuration Firebase) plutôt qu'une liste figée.
 */
export async function getMobileChannels(links: StoreLinksStatus): Promise<AdminCatalogItem[]> {
  const [androidDevices, iosDevices] = await Promise.all([countDevices("android"), countDevices("ios")]);
  const pushReady = isPushConfigured();
  const androidMeta = [
    links.googlePlayUrl ? "Publiée sur Google Play" : "Installation par la page /download (PWA)",
    androidDevices === null
      ? null
      : plural(androidDevices, "appareil enregistré", "appareils enregistrés") +
        (pushReady ? "" : " · push inactif (Firebase)"),
  ];

  return [
    {
      id: "web",
      title: "Application Web",
      subtitle: "SaaS Next.js responsive",
      meta: "Canal principal",
      status: "active",
      icon: "monitor-smartphone",
      href: "/",
    },
    {
      id: "pwa",
      title: "PWA",
      subtitle: "Installation depuis le navigateur",
      meta: "Page /download · manifest + service worker",
      status: "active",
      icon: "app-window",
      href: "/download",
    },
    {
      id: "android",
      title: "Android",
      subtitle: "Conteneur Capacitor (PWA + Capacitor)",
      meta: androidMeta.filter(Boolean).join(" · "),
      status: links.googlePlayUrl ? "active" : "beta",
      icon: "smartphone",
      href: "/download#android",
    },
    {
      id: "ios",
      title: "iOS",
      subtitle: "Conteneur Capacitor (PWA + Capacitor)",
      meta: links.appStoreUrl
        ? "Publiée sur l'App Store"
        : iosDevices
          ? `Installation par la page /download · ${plural(iosDevices, "appareil enregistré", "appareils enregistrés")}`
          : "Installation par la page /download (écran d'accueil)",
      status: links.appStoreUrl ? "active" : "beta",
      icon: "smartphone",
      href: "/download#iphone",
    },
  ];
}
