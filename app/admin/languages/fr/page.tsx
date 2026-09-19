import AdminDraftForm from "@/components/admin/AdminDraftForm";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminFrenchLanguagePage() {
  await requireAdmin();
  return (
    <AdminDraftForm
      eyebrow="Langues"
      title="Configurer le français"
      description="Consulte les informations de la langue principale de MusikPro."
      backHref="/admin/languages"
      note="Le français est utilisé dans l’interface actuelle. Les pourcentages de traduction ne sont pas calculés tant qu’un catalogue i18n n’est pas branché."
      fields={[
        { label: "Langue", value: "Français" },
        { label: "Code ISO", value: "fr" },
        { label: "Nom natif", value: "Français" },
        { label: "Région", value: "Afrique de l’Ouest" },
      ]}
      choices={["Utilisateurs existants", "Langue régionale par défaut", "Traductions complètes requises"]}
    />
  );
}
