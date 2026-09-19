import AdminDraftForm from "@/components/admin/AdminDraftForm";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminNewLanguagePage() {
  await requireAdmin();
  return (
    <AdminDraftForm
      eyebrow="Langues"
      title="Ajouter une langue"
      description="Prépare une langue et son périmètre avant sa traduction."
      backHref="/admin/languages"
      note="Aucun service de traduction ni stockage de progression n’est connecté. Cette interface prépare le futur contrat métier."
      fields={[
        {
          label: "Langue",
          type: "select",
          options: ["Espagnol", "Lingala", "Swahili", "Portugais", "Yoruba", "Hausa", "Igbo"],
        },
        { label: "Code ISO", placeholder: "Ex. es" },
        { label: "Nom natif", placeholder: "Ex. Español" },
        { label: "Région", placeholder: "Ex. International" },
      ]}
    />
  );
}
