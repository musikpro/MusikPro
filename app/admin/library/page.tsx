import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLibraryPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Contenu"
      title="Bibliothèque"
      description="Organise les collections qui alimenteront la découverte musicale."
      searchLabel="Rechercher une collection"
      action={{ href: "/admin/library/new", label: "Nouvelle collection" }}
      sourceNote="Aucune table de collections ou de chansons publiées n’existe encore. Aucun contenu fictif n’est affiché dans l’espace réel."
      items={[]}
      emptyTitle="Aucune collection enregistrée"
      emptyDescription="Les collections et chansons réelles apparaîtront ici après leur publication."
    />
  );
}
