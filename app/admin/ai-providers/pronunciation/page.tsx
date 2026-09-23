import Link from "next/link";
import { AdminBackLink, AdminEmptyModule, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getLyricsProvider } from "@/lib/ai/provider";

export default async function AdminPronunciationProviderPage() {
  await requireAdmin();
  const provider = await getLyricsProvider();
  const connected = provider.enabled && Boolean(provider.apiKey);

  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Fournisseur phonétique"
        title="Prononciation des noms"
        description="Suggère la prononciation phonétique des prénoms saisis par les utilisateurs."
      />
      {connected ? (
        <section className="admin-panel admin-module-empty">
          <span>
            <Icon i="speech" size={26} />
          </span>
          <h2>{provider.provider === "anthropic" ? "Claude / Anthropic" : "OpenAI / ChatGPT"}</h2>
          <p>
            Modèle utilisé : {provider.model}. Cette capacité réutilise automatiquement le même fournisseur et la
            même clé que la génération des paroles — aucune configuration ni clé séparée n’est nécessaire.
          </p>
          <span className="admin-status is-success">Connecté</span>
          <Link href="/admin/ai-providers/lyrics" className="admin-back-link" style={{ marginTop: 16 }}>
            <Icon i="settings" size={16} />
            Changer le fournisseur de paroles
          </Link>
        </section>
      ) : (
        <AdminEmptyModule
          icon="speech"
          title="Fournisseur à choisir"
          description="Configure d’abord un fournisseur pour les paroles (OpenAI ou Claude) : la prononciation des noms le réutilisera automatiquement, sans réglage supplémentaire."
        />
      )}
    </AdminPage>
  );
}
