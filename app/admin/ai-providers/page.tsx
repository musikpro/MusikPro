import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const providers = [
  [
    "lyrics",
    "Génération des paroles",
    "Modèle de texte et consignes musicales",
    "Aucun fournisseur configuré",
    "inactive",
    "file-music",
  ],
  [
    "audio",
    "Génération audio",
    "Création des deux versions de chanson",
    "Aucun fournisseur configuré",
    "inactive",
    "audio-waveform",
  ],
  [
    "voice",
    "Prononciation des noms",
    "Assistance phonétique pour les prénoms",
    "Aucun fournisseur configuré",
    "inactive",
    "speech",
  ],
  [
    "moderation",
    "Contrôle du contenu",
    "Filtrage des requêtes et résultats",
    "Architecture à définir",
    "coming",
    "shield-check",
  ],
] as const;

export default async function AdminAIProvidersPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Intelligence artificielle"
      title="Fournisseurs IA"
      description="Centralise les capacités nécessaires à la génération musicale."
      searchLabel="Rechercher une capacité"
      sourceNote="Aucun fournisseur de génération musicale réel n’est déclaré dans le registre des fonctionnalités. Aucun nom commercial n’est présenté comme intégré."
      items={providers.map(([id, title, subtitle, meta, status, icon]) => ({
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
