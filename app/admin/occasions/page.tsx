import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const occasions = [
  ["birthday", "Anniversaire", "Célébrer une personne et son histoire", "Parcours actif", "active", "cake-slice"],
  ["love", "Amour", "Déclaration, couple et hommage amoureux", "Parcours actif", "active", "heart"],
  ["graduation", "Diplôme", "Marquer une réussite académique", "Parcours actif", "active", "graduation-cap"],
  ["party", "Fête", "Créer une ambiance festive", "Parcours actif", "active", "party-popper"],
  ["tribute", "Hommage", "Rendre hommage à une personne importante", "À préparer", "coming", "flower-2"],
  ["wedding", "Mariage", "Accompagner une célébration nuptiale", "À préparer", "coming", "gem"],
] as const;

export default async function AdminOccasionsPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Configuration musicale"
      title="Occasions"
      description="Gère les points de départ proposés dans le parcours de création."
      searchLabel="Rechercher une occasion"
      sourceNote="Les occasions visibles sont alignées sur le parcours client actuel, mais ne sont pas encore persistées dans une table dédiée."
      items={occasions.map(([id, title, subtitle, meta, status, icon]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        icon,
      }))}
    />
  );
}
