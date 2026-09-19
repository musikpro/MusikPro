import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const collections = [
  ["afrobeat", "Afrobeat Essentials", "Une sélection de rythmes Afrobeat", "Collection publique", "active"],
  ["gospel", "Gospel Vibes", "Musiques gospel inspirantes", "Collection publique", "active"],
  ["amapiano", "Amapiano Hits", "Les meilleures pistes Amapiano", "Collection publique", "active"],
  ["rnb", "R&B Romance", "R&B pour les moments intimes", "Brouillon", "inactive"],
  ["reggae", "Reggae Chill", "Reggae relaxant et méditatif", "Brouillon", "inactive"],
] as const;

export default async function AdminLibraryPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Contenu"
      title="Bibliothèque"
      description="Organise les collections qui alimenteront la découverte musicale."
      searchLabel="Rechercher une collection"
      action={{ href: "/admin/library/new", label: "Nouvelle collection" }}
      sourceNote="Aucune table de collections ou de chansons publiées n’existe encore. Les contenus présentés sont des données de conception Banani."
      items={collections.map(([id, title, subtitle, meta, status]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        icon: "library",
      }))}
    />
  );
}
