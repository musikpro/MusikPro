import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminMusicStylesPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Configuration musicale"
      title="Styles musicaux"
      description="Structure les styles proposés pendant la création d’une chanson."
      searchLabel="Rechercher un style"
      action={{ href: "/admin/music-styles/new", label: "Nouveau style" }}
      sourceNote="Le catalogue de démonstration reste isolé du compte réel. Une table métier sera nécessaire avant toute publication."
      items={[]}
      emptyTitle="Aucun style enregistré"
      emptyDescription="Les styles réels apparaîtront ici après leur enregistrement."
    />
  );
}
