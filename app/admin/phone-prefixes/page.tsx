import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const countries = [
  ["ci", "🇨🇮  +225", "Côte d’Ivoire", "Préfixe par défaut", "active"],
  ["sn", "🇸🇳  +221", "Sénégal", "Disponible", "active"],
  ["ml", "🇲🇱  +223", "Mali", "Disponible", "active"],
  ["bf", "🇧🇫  +226", "Burkina Faso", "Disponible", "active"],
  ["ne", "🇳🇪  +227", "Niger", "Disponible", "active"],
  ["gh", "🇬🇭  +233", "Ghana", "Disponible", "active"],
  ["tg", "🇹🇬  +228", "Togo", "À préparer", "coming"],
  ["bj", "🇧🇯  +229", "Bénin", "À préparer", "coming"],
] as const;

export default async function AdminPhonePrefixesPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Téléphonie"
      title="Préfixes téléphoniques"
      description="Visualise les indicatifs proposés dans le parcours de commande."
      searchLabel="Rechercher un préfixe"
      sourceNote="Cette liste reprend le sélecteur actuel du parcours client. La configuration centrale et les mutations ne sont pas encore persistées."
      items={countries.map(([id, title, subtitle, meta, status]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        icon: "phone",
      }))}
    />
  );
}
