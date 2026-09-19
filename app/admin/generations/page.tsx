import { AdminEmptyModule, AdminPage, AdminPageHeader, AdminSourceNotice } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminGenerationsPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Production musicale"
        title="Générations"
        description="Suis les chansons produites, leur statut, leur durée et leur qualité."
      />
      <AdminSourceNotice>
        Le schéma Neon ne contient pas encore de table de générations musicales. Aucun compteur de maquette n’est
        présenté comme une donnée réelle.
      </AdminSourceNotice>
      <AdminEmptyModule
        icon="music-2"
        title="Historique des générations à connecter"
        description="Cette page accueillera la recherche, les filtres de statut, l’écoute et le diagnostic des erreurs dès que le moteur de génération persistera ses résultats."
      />
    </AdminPage>
  );
}
