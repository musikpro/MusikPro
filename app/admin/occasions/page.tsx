import { asc } from "drizzle-orm";
import Link from "next/link";
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
        <AdminOccasionSortableGrid occasions={rows} />
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
