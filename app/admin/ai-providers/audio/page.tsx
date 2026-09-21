import AdminAiCapabilityPlaceholder from "@/components/admin/AdminAiCapabilityPlaceholder";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminAudioProviderPage() {
  await requireAdmin();
  return (
    <AdminAiCapabilityPlaceholder
      eyebrow="Fournisseur audio"
      title="Génération des chansons audio"
      description="Espace réservé au futur service qui transformera les paroles validées en chansons."
      icon="audio-waveform"
      message="Aucune API audio n’est encore sélectionnée. Quand le fournisseur sera choisi, sa clé, ses modèles, ses quotas et son test de connexion seront configurés uniquement ici."
    />
  );
}
