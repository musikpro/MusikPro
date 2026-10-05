import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminOccasionStoryEditor from "@/components/admin/AdminOccasionStoryEditor";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import AdminOccasionSortableGrid from "@/components/admin/AdminOccasionSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminOccasionsPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(occasions).orderBy(asc(occasions.sortOrder), asc(occasions.name));
  const activeCount = rows.filter((occasion) => occasion.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Occasions"
        description={`${activeCount} occasion${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""} sur ${rows.length}. Le même catalogue alimente les espaces client réel et démo.`}
        action={{ href: "/admin/occasions/new", label: "Nouvelle occasion" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>Le nom, l’emoji, l’état et l’ordre sont appliqués au parcours de création client.</p>
        </div>
      </div>
      {rows.length ? (
        <AdminTabs
          ariaLabel="Sections des occasions"
          urlParam="tab"
          tabs={[
            { id: "catalog", label: "Catalogue" },
            { id: "story", label: "Personnalisation" },
          ]}
        >
          <AdminTabPanel id="catalog">
            <AdminOccasionSortableGrid occasions={rows} />
          </AdminTabPanel>
          <AdminTabPanel id="story">
            <p className="admin-page-description" style={{ marginBottom: 12 }}>
              Chaque occasion, y compris celles que tu ajoutes, apparaît ici. Modifie le titre, le sous-titre, le masque
              du champ (texte d’exemple) et l’astuce de la page suivante, ou génère-les avec l’IA.
            </p>
            <AdminOccasionStoryEditor occasions={rows} />
          </AdminTabPanel>
        </AdminTabs>
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="calendar-heart" size={24} />
          <strong>Aucune occasion enregistrée</strong>
          <p>Ajoute une occasion pour la proposer dans le parcours de création.</p>
          <Link className="admin-primary-action" href="/admin/occasions/new">
            <Icon i="plus" size={16} /> Ajouter une occasion
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
