import AdminAiCapabilityPlaceholder from "@/components/admin/AdminAiCapabilityPlaceholder";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPronunciationProviderPage() {
  await requireAdmin();
  return (
    <AdminAiCapabilityPlaceholder
      eyebrow="Fournisseur phonétique"
      title="Prononciation des noms"
      description="Espace indépendant pour préparer les prénoms, expressions et langues locales."
      icon="speech"
      message="Cette capacité reste à définir. Elle pourra utiliser son propre fournisseur sans partager la clé du générateur de paroles ou du moteur audio."
    />
  );
}
