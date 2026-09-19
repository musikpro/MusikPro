import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminMusicStyleSortableGrid from "@/components/admin/AdminMusicStyleSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminMusicStylesPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(musicStyles)
    .orderBy(asc(musicStyles.sortOrder), asc(musicStyles.name));
  const activeCount = rows.filter((style) => style.active).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Styles musicaux"
        description={`${activeCount} style${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Les changements sont appliqués au parcours client réel.`}
        action={{ href: "/admin/music-styles/new", label: "Nouveau style" }}
      />

      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>Seuls les styles actifs sont proposés aux clients lors de la création d’une chanson.</p>
        </div>
      </div>

      {rows.length ? (
        <AdminMusicStyleSortableGrid styles={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="search-x" size={24} />
          <strong>Aucun style enregistré</strong>
          <p>Ajoute un style musical pour le rendre disponible dans le parcours client.</p>
          <Link className="admin-primary-action" href="/admin/music-styles/new">
            <Icon i="plus" size={16} />
            Ajouter un style
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
