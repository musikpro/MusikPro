import AdminDraftForm from "@/components/admin/AdminDraftForm";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminNewCollectionPage() {
  await requireAdmin();
  return (
    <AdminDraftForm
      eyebrow="Bibliothèque"
      title="Nouvelle collection"
      description="Prépare une collection cohérente pour la découverte musicale."
      backHref="/admin/library"
      note="La table Collection et son action serveur doivent être ajoutées avant de permettre l’enregistrement."
      fields={[
        { label: "Nom de la collection", placeholder: "Ex. Afrobeat Essentials" },
        { label: "Accès", type: "select", options: ["Public", "Privé"] },
        { label: "Description", type: "textarea", placeholder: "Décris la collection en quelques mots" },
      ]}
      choices={["Afrobeat", "Gospel", "Amapiano", "R&B", "Reggae", "Afro-Pop", "Folklore"]}
    />
  );
}
