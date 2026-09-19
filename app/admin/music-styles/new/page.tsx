import AdminDraftForm from "@/components/admin/AdminDraftForm";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminNewMusicStylePage() {
  await requireAdmin();
  return (
    <AdminDraftForm
      eyebrow="Styles musicaux"
      title="Nouveau style musical"
      description="Définis le nom, le ton et la disponibilité d’un style."
      backHref="/admin/music-styles"
      note="La publication restera désactivée jusqu’à la création du catalogue métier et de sa validation serveur Zod."
      fields={[
        { label: "Nom du style", placeholder: "Ex. Coupé-décalé" },
        { label: "État initial", type: "select", options: ["Brouillon", "Actif"] },
        { label: "Description", type: "textarea", placeholder: "Décris les rythmes, instruments et l’ambiance" },
      ]}
      choices={["Énergique", "Romantique", "Spirituel", "Festif", "Acoustique", "Moderne"]}
    />
  );
}
