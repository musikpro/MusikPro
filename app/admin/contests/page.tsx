import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const items = [
  ["afrobeat", "Afrobeat Challenge", "Créez la meilleure chanson Afrobeat", "À définir", "active"],
  ["gospel", "Gospel Inspiration", "Une scène pour les créations spirituelles", "À définir", "coming"],
  ["amapiano", "Amapiano Vibes", "Produire le meilleur groove Amapiano", "À définir", "coming"],
  ["rnb", "R&B Love Songs", "Les plus belles chansons d’amour R&B", "À définir", "inactive"],
] as const;

export default async function AdminContestsPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Engagement"
      title="Concours"
      description="Prépare et organise les concours musicaux de la communauté MusikPro."
      searchLabel="Rechercher un concours"
      sourceNote="Le modèle Concours et les règles de participation ne sont pas encore présents dans Neon. Les cartes ci-dessous servent de structure éditoriale."
      items={items.map(([id, title, subtitle, meta, status]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        icon: "trophy",
      }))}
    />
  );
}
