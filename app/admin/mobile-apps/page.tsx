import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { AdminCatalogBody } from "@/components/admin/AdminCatalogPage";
import StoreLinksPanel from "@/components/admin/StoreLinksPanel";
import AppReleasesPanel from "@/components/admin/AppReleasesPanel";
import { isBlobConfigured, listAppReleases } from "@/lib/app-releases/server";
import { requireAdmin } from "@/lib/auth/session";
import { getStoreLinks } from "@/lib/settings/store-links";

import type { AdminCatalogItem } from "@/components/admin/AdminCatalogPage";

/** Canaux de diffusion calculés à partir de l'état réel : le fichier Android dépend de la version publiée. */
function buildChannels(
  published: { version: string; downloads: number } | undefined,
  googlePlayUrl: string | null,
): AdminCatalogItem[] {
  const downloads = published?.downloads ?? 0;
  return [
    {
      id: "web",
      title: "Application Web",
      subtitle: "SaaS Next.js responsive",
      meta: "Canal principal",
      status: "active",
      icon: "monitor-smartphone",
    },
    {
      id: "pwa",
      title: "PWA",
      subtitle: "Installation depuis le navigateur",
      meta: "Manifest + service worker",
      status: "active",
      icon: "app-window",
    },
    {
      id: "android",
      title: "Android",
      subtitle: googlePlayUrl ? "Publiée sur Google Play" : "Fichier d'installation hébergé sur le site",
      meta: published
        ? `Version ${published.version} · ${downloads} téléchargement${downloads > 1 ? "s" : ""}`
        : "Aucune version publiée",
      status: published || googlePlayUrl ? "active" : "coming",
      icon: "smartphone",
    },
    {
      id: "ios",
      title: "iOS",
      subtitle: "Pas encore disponible",
      meta: "Prévu plus tard",
      status: "coming",
      icon: "smartphone",
    },
  ];
}

export default async function AdminMobileAppsPage() {
  await requireAdmin();
  const storeLinks = await getStoreLinks();
  const releases = await listAppReleases("android").catch(() => []);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Distribution"
        title="Applications mobiles"
        description="Suit les canaux de diffusion et configure les liens de téléchargement affichés aux clients."
      />
      <AdminTabs
        ariaLabel="Applications mobiles"
        tabs={[
          { id: "channels", label: "Canaux de diffusion" },
          { id: "store-links", label: "Liens des stores" },
          { id: "downloads", label: "Fichiers d'installation" },
        ]}
      >
        <AdminTabPanel id="channels">
          <AdminCatalogBody
            items={buildChannels(
              releases.find((release) => release.published),
              storeLinks.googlePlayUrl,
            )}
            searchLabel="Rechercher une plateforme"
            showResultCount={false}
          />
        </AdminTabPanel>
        <AdminTabPanel id="store-links">
          <StoreLinksPanel status={storeLinks} />
        </AdminTabPanel>
        <AdminTabPanel id="downloads">
          <AppReleasesPanel
            releases={releases.map((release) => ({
              id: release.id,
              version: release.version,
              build: release.build,
              sizeBytes: release.sizeBytes,
              sha256: release.sha256,
              notes: release.notes,
              published: release.published,
              downloads: release.downloads,
              createdAt: release.createdAt.toISOString(),
            }))}
            storageReady={isBlobConfigured()}
            suggestedBuild={(releases[0]?.build ?? 0) + 1}
          />
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
