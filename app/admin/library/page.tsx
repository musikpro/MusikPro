import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminLibraryCollectionGrid from "@/components/admin/AdminLibraryCollectionGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { libraryCollections } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLibraryPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(libraryCollections)
    .orderBy(asc(libraryCollections.sortOrder), asc(libraryCollections.name));
  const published = rows.filter((row) => row.active && row.access === "public").length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Collections musicales"
        description={`${published} collection${published > 1 ? "s" : ""} publiée${published > 1 ? "s" : ""} sur ${rows.length}. Elles structurent la page Découvrir des clients.`}
        action={{ href: "/admin/library/new", label: "Nouvelle collection" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Bibliothèque connectée à Neon</strong>
          <p>Publication, filtres de styles et ordre sont synchronisés avec les espaces client réel et démo.</p>
        </div>
      </div>
      <div className="admin-library-help">
        <Icon i="lightbulb" size={19} />
        <div>
          <strong>Comment utiliser les collections ?</strong>
          <p>
            Regroupe les chansons par univers musical. Les exemples installés peuvent être renommés, enrichis,
            réorganisés ou supprimés.
          </p>
        </div>
      </div>
      {rows.length ? (
        <AdminLibraryCollectionGrid collections={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="library" size={25} />
          <strong>Aucune collection</strong>
          <p>Crée une collection pour organiser la page Découvrir.</p>
          <Link className="admin-primary-action" href="/admin/library/new">
            <Icon i="plus" size={16} /> Nouvelle collection
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
