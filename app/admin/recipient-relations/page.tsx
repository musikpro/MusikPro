import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminRecipientRelationSortableGrid from "@/components/admin/AdminRecipientRelationSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { recipientRelations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminRecipientRelationsPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(recipientRelations)
    .orderBy(asc(recipientRelations.sortOrder), asc(recipientRelations.name));
  const activeCount = rows.filter((relation) => relation.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Liens avec le destinataire"
        description={`${activeCount} lien${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Cette liste alimente l’étape « À qui est destinée la chanson ? » du parcours de création.`}
        action={{ href: "/admin/recipient-relations/new", label: "Nouveau lien" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>Le nom, l’état et l’ordre sont appliqués au sélecteur « Lien avec cette personne ».</p>
        </div>
      </div>
      {rows.length ? (
        <AdminRecipientRelationSortableGrid relations={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="heart-handshake" size={24} />
          <strong>Aucun lien enregistré</strong>
          <p>Ajoute un lien pour le proposer dans le parcours de création.</p>
          <Link className="admin-primary-action" href="/admin/recipient-relations/new">
            <Icon i="plus" size={16} /> Ajouter un lien
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
