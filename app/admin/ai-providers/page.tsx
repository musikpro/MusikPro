import { eq } from "drizzle-orm";
import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminAIProvidersPage() {
  await requireAdmin();
  const [lyricsProvider] = await getServiceDb()
    .select({ enabled: aiProviderConfigs.enabled, model: aiProviderConfigs.defaultModel, provider: aiProviderConfigs.provider })
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.isDefaultForLyrics, true))
    .limit(1);

  return (
    <AdminCatalogPage
      eyebrow="Intelligence artificielle"
      title="Fournisseurs IA"
      description="Configure séparément chaque capacité de création musicale."
      searchLabel="Rechercher une capacité"
      sourceNote="Chaque boîte possède ses propres réglages et secrets. Les fournisseurs non choisis restent désactivés sans bloquer les autres capacités."
      items={[
        {
          id: "lyrics",
          title: "Génération des paroles",
          subtitle: "Création, révision et rallongement des paroles",
          meta: lyricsProvider ? `${lyricsProvider.provider === "anthropic" ? "Claude" : "OpenAI"} · ${lyricsProvider.model}` : "OpenAI ou Claude à configurer",
          status: lyricsProvider?.enabled ? "active" : "inactive",
          icon: "file-music",
          href: "/admin/ai-providers/lyrics",
        },
        {
          id: "audio",
          title: "Génération audio",
          subtitle: "Transformation des paroles en chansons et versions audio",
          meta: "Fournisseur audio à choisir",
          status: "inactive",
          icon: "audio-waveform",
          href: "/admin/ai-providers/audio",
        },
        {
          id: "pronunciation",
          title: "Prononciation des noms",
          subtitle: "Assistance phonétique pour les prénoms et mots locaux",
          meta: "Fournisseur à choisir",
          status: "coming",
          icon: "speech",
          href: "/admin/ai-providers/pronunciation",
        },
        {
          id: "moderation",
          title: "Contrôle du contenu",
          subtitle: "Filtrage des demandes et des résultats générés",
          meta: "Architecture à définir",
          status: "coming",
          icon: "shield-check",
          href: "/admin/ai-providers/moderation",
        },
      ]}
    />
  );
}
