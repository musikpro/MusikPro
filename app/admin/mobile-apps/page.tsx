import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { AdminCatalogBody } from "@/components/admin/AdminCatalogPage";
import StoreLinksPanel from "@/components/admin/StoreLinksPanel";
import { requireAdmin } from "@/lib/auth/session";
import { getMobileChannels } from "@/lib/admin/mobile-channels";
import { getStoreLinks } from "@/lib/settings/store-links";

export default async function AdminMobileAppsPage() {
  await requireAdmin();
  const storeLinks = await getStoreLinks();
  const channels = await getMobileChannels(storeLinks);
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
          <AdminCatalogBody items={channels} searchLabel="Rechercher une plateforme" showResultCount={false} />
        </AdminTabPanel>
        <AdminTabPanel id="store-links">
          <StoreLinksPanel status={storeLinks} />
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
