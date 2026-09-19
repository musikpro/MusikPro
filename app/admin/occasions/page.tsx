import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminOccasionsPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Configuration musicale"
      title="Occasions"
      description="Gère les points de départ proposés dans le parcours de création."
      searchLabel="Rechercher une occasion"
      sourceNote="Les occasions du mode démo ne sont pas injectées dans le compte réel. Une table dédiée reste à connecter."
      items={[]}
      emptyTitle="Aucune occasion enregistrée"
      emptyDescription="Les occasions réelles apparaîtront ici après leur enregistrement."
    />
  );
}
