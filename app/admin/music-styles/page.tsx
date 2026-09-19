import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const styles = [
  [
    "afrobeat",
    "Afrobeat",
    "Rythmes énergiques et percussions africaines",
    "Catalogue de création",
    "active",
    "#f26522",
  ],
  ["gospel", "Gospel", "Musique spirituelle et inspirante", "Catalogue de création", "active", "#9467bd"],
  ["amapiano", "Amapiano", "Groove moderne d’Afrique du Sud", "Catalogue de création", "active", "#16844b"],
  ["rnb", "R&B", "Rhythm and Blues contemporain", "Catalogue de création", "active", "#d45b9a"],
  ["reggae", "Reggae", "Reggae traditionnel et moderne", "Catalogue de création", "active", "#b86808"],
  ["afropop", "Afro-Pop", "Pop africaine énergique", "À préparer", "coming", "#1c78c0"],
  ["folklore", "Folklore", "Musiques traditionnelles africaines", "À préparer", "coming", "#715548"],
] as const;

export default async function AdminMusicStylesPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Configuration musicale"
      title="Styles musicaux"
      description="Structure les styles proposés pendant la création d’une chanson."
      searchLabel="Rechercher un style"
      action={{ href: "/admin/music-styles/new", label: "Nouveau style" }}
      sourceNote="Le catalogue de styles est encore porté par l’interface de démonstration. Une table métier sera nécessaire avant toute publication réelle."
      items={styles.map(([id, title, subtitle, meta, status, accent]) => ({
        id,
        title,
        subtitle,
        meta,
        status,
        accent,
        icon: "audio-lines",
      }))}
    />
  );
}
