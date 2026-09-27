import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { AdminCatalogBody } from "@/components/admin/AdminCatalogPage";
import StoreLinksPanel from "@/components/admin/StoreLinksPanel";
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
    meta: "Configuration à confirmer",
    status: "coming" as const,
    icon: "app-window",
  },
  {
    id: "android",
    title: "Android",
    subtitle: "Conteneur Capacitor WebView",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
  {
    id: "ios",
    title: "iOS",
    subtitle: "Conteneur Capacitor WebView",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
];

export default async function AdminMobileAppsPage() {
  await requireAdmin();
  const storeLinks = await getStoreLinks();
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
        ]}
      >
        <AdminTabPanel id="channels">
          <AdminCatalogBody
            items={apps}
            searchLabel="Rechercher une plateforme"
            sourceNote="Le Web responsive reste le produit actif. Android et iOS sont optionnels et utiliseront l’URL HTTPS du SaaS via Capacitor WebView lorsque la Phase 21 sera activée."
          />
        </AdminTabPanel>
        <AdminTabPanel id="store-links">
          <StoreLinksPanel status={storeLinks} />
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
