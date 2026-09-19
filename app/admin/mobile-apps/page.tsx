import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { requireAdmin } from "@/lib/auth/session";

const apps = [
  {
    id: "web",
    title: "Application Web",
    subtitle: "SaaS Next.js responsive",
    meta: "Canal principal",
    status: "active" as const,
    icon: "monitor-smartphone",
  },
  {
    id: "pwa",
    title: "PWA",
    subtitle: "Installation depuis le navigateur",
    meta: "Configuration à confirmer",
    status: "coming" as const,
    icon: "app-window",
  },
  {
    id: "android",
    title: "Android",
    subtitle: "Conteneur Capacitor WebView",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
  {
    id: "ios",
    title: "iOS",
    subtitle: "Conteneur Capacitor WebView",
    meta: "Phase 21 optionnelle",
    status: "coming" as const,
    icon: "smartphone",
  },
];

export default async function AdminMobileAppsPage() {
  await requireAdmin();
  return (
    <AdminCatalogPage
      eyebrow="Distribution"
      title="Applications mobiles"
      description="Suit les canaux de diffusion sans dupliquer le backend du SaaS."
      searchLabel="Rechercher une plateforme"
      sourceNote="Le Web responsive reste le produit actif. Android et iOS sont optionnels et utiliseront l’URL HTTPS du SaaS via Capacitor WebView lorsque la Phase 21 sera activée."
      items={apps}
    />
  );
}
