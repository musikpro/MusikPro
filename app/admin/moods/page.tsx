import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminMoodSortableGrid from "@/components/admin/AdminMoodSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { moods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminMoodsPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(moods).orderBy(asc(moods.sortOrder), asc(moods.name));
  const activeCount = rows.filter((mood) => mood.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Ambiances"
        description={`${activeCount} ambiance${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""} sur ${rows.length}. Le même catalogue alimente les espaces client réel et démo.`}
        action={{ href: "/admin/moods/new", label: "Nouvelle ambiance" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>
            Le nom, l’emoji, l’état et l’ordre sont appliqués à l’étape « Choisis le style et l’ambiance » du parcours
            client. La consigne IA est envoyée à Musicful avec le nom, sans être montrée au client.
          </p>
        </div>
      </div>
      {rows.length ? (
        <AdminMoodSortableGrid moods={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="smile-plus" size={24} />
          <strong>Aucune ambiance enregistrée</strong>
          <p>Ajoute une ambiance pour la proposer dans le parcours de création.</p>
          <Link className="admin-primary-action" href="/admin/moods/new">
            <Icon i="plus" size={16} /> Ajouter une ambiance
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
