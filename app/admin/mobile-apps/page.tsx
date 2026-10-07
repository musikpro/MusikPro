import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { AdminCatalogBody } from "@/components/admin/AdminCatalogPage";
import StoreLinksPanel from "@/components/admin/StoreLinksPanel";
import AppReleasesPanel from "@/components/admin/AppReleasesPanel";
import { isBlobConfigured, listAppReleases } from "@/lib/app-releases/server";
import { requireAdmin } from "@/lib/auth/session";
import { getStoreLinks } from "@/lib/settings/store-links";

const apps = [
  {
    id: "web",
    title: "Application Web",
    subtitle: "SaaS Next.js responsive",
    meta: "Canal principal",
    status: "active" as const,
    icon: "monitor-smartphone",
  },
  {
    id: "pwa",
    title: "PWA",
    subtitle: "Installation depuis le navigateur",
    meta: "Manifest + service worker",
    status: "active" as const,
    icon: "app-window",
  },
  {
    id: "android",
    title: "Android",
    subtitle: "Conteneur Capacitor (PWA + Capacitor)",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
  {
    id: "ios",
    title: "iOS",
    subtitle: "Conteneur Capacitor (PWA + Capacitor)",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
];

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
            items={apps}
            searchLabel="Rechercher une plateforme"
            sourceNote="Le Web responsive reste le produit actif. Android et iOS sont optionnels et utiliseront la couche PWA + Capacitor autour du SaaS HTTPS lorsque la Phase 21 sera activée."
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
