import AdminAiCapabilityPlaceholder from "@/components/admin/AdminAiCapabilityPlaceholder";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminModerationProviderPage() {
  await requireAdmin();
  return (
    <AdminAiCapabilityPlaceholder
      eyebrow="Sécurité IA"
      title="Contrôle du contenu"
      description="Espace réservé aux règles de filtrage des demandes et des résultats."
      icon="shield-check"
      message="Le moteur de modération sera choisi séparément. Aucun filtrage externe n’est déclaré actif pour le moment."
    />
  );
}
