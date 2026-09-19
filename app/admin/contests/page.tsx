import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminContestsPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Engagement"
      title="Concours"
      description="Prépare et organise les concours musicaux de la communauté MusikPro."
      searchLabel="Rechercher un concours"
      sourceNote="Le modèle Concours et les règles de participation ne sont pas encore présents dans Neon. Aucun exemple fictif n’est affiché dans l’espace réel."
      items={[]}
      emptyTitle="Aucun concours enregistré"
      emptyDescription="Les concours réels apparaîtront ici après leur enregistrement."
    />
  );
}
