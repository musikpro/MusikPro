import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const languages = [
  [
    "fr",
    "Français",
    "Afrique de l’Ouest · Français",
    "Interface disponible",
    "active",
    "languages",
    "/admin/languages/fr",
  ],
  ["en", "Anglais", "International · English", "Interface disponible", "active", "languages", undefined],
  ["es", "Espagnol", "International · Español", "Traductions à préparer", "coming", "languages", undefined],
  ["ln", "Lingala", "Afrique centrale · Lingála", "Traductions à préparer", "coming", "languages", undefined],
  ["sw", "Swahili", "Afrique de l’Est · Kiswahili", "Traductions à préparer", "coming", "languages", undefined],
] as const;

export default async function AdminLanguagesPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Localisation"
      title="Langues"
      description="Prépare les langues d’interface et leur niveau de traduction."
      searchLabel="Rechercher une langue"
      action={{ href: "/admin/languages/new", label: "Nouvelle langue" }}
      sourceNote="Le sélecteur client propose actuellement le français et l’anglais. Aucun moteur de traduction persistant n’est encore connecté."
      items={languages.map(([id, title, subtitle, meta, status, icon, href]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        icon,
        href,
      }))}
    />
  );
}
