import { asc, count, eq, and } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminOccasionFieldsPage() {
  await requireAdmin();
  const database = getServiceDb();
  const rows = await database.select().from(occasions).orderBy(asc(occasions.sortOrder), asc(occasions.name));
  const counts = await database
    .select({ occasionId: occasionFields.occasionId, total: count() })
    .from(occasionFields)
    .where(and(eq(occasionFields.active, true)))
    .groupBy(occasionFields.occasionId);
  const totals = new Map(counts.map((row) => [row.occasionId, row.total]));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Détails par occasion"
        description="Choisis, pour chaque occasion, les blocs et les champs de l’étape « Personnalise ta chanson »."
      />
      <div className="admin-catalog-grid admin-occasion-fields-grid">
        {rows.map((occasion) => (
          <Link key={occasion.id} href={`/admin/occasion-fields/${occasion.id}`} className="admin-catalog-card admin-music-style-card is-active">
            <div className="admin-catalog-card-head">
              <span className="admin-catalog-icon" aria-hidden="true">{occasion.emoji}</span>
              <span className={`admin-status ${occasion.active ? "is-success" : "is-pending"}`}>
                {occasion.active ? "Active" : "Désactivée"}
              </span>
            </div>
            <h2>{occasion.name}</h2>
            <small>{totals.get(occasion.id) ?? 0} champ(s) actif(s)</small>
            <span className="admin-secondary-action"><Icon i="pencil" size={15} /> Configurer</span>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
