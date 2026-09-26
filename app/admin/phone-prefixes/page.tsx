import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminPhonePrefixSortableGrid from "@/components/admin/AdminPhonePrefixSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPhonePrefixesPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(phonePrefixes)
    .orderBy(asc(phonePrefixes.sortOrder), asc(phonePrefixes.countryName));
  const activeCount = rows.filter((prefix) => prefix.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Téléphonie"
        title="Préfixes téléphoniques"
        description={`${activeCount} préfixe${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Le même catalogue alimente le champ téléphone du parcours client.`}
        action={{ href: "/admin/phone-prefixes/new", label: "Nouveau préfixe" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>L’indicatif, le nombre de chiffres, l’état et l’ordre sont appliqués au parcours de paiement client.</p>
        </div>
      </div>
      {rows.length ? (
        <AdminPhonePrefixSortableGrid prefixes={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="phone" size={24} />
          <strong>Aucun préfixe enregistré</strong>
          <p>Ajoute un préfixe pour le proposer dans le champ téléphone du parcours client.</p>
          <Link className="admin-primary-action" href="/admin/phone-prefixes/new">
            <Icon i="plus" size={16} /> Ajouter un préfixe
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
