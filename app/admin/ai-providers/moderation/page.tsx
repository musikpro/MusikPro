import Link from "next/link";
import { AdminBackLink, AdminEmptyModule, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getLyricsProvider } from "@/lib/ai/provider";

export default async function AdminModerationProviderPage() {
  await requireAdmin();
  const provider = await getLyricsProvider();
  const connected = provider.enabled && Boolean(provider.apiKey);

  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Sécurité IA"
        title="Contrôle du contenu"
        description="Filtre les demandes des utilisateurs et les paroles générées avant qu’elles n’atteignent le tableau de bord client."
      />
      {connected ? (
        <section className="admin-panel admin-module-empty">
          <span>
            <Icon i="shield-check" size={26} />
          </span>
          <h2>{provider.provider === "anthropic" ? "Claude / Anthropic" : "OpenAI / ChatGPT"}</h2>
          <p>
            Modèle utilisé : {provider.model}. Chaque demande de paroles (histoire, détails, destinataire) et chaque
            résultat généré est analysé avant d’être utilisé ou affiché ; tout contenu signalé est bloqué et
            consigné dans le journal d’audit. Cette capacité réutilise automatiquement le même fournisseur et la
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
          icon="shield-check"
          title="Fournisseur à choisir"
          description="Configure d’abord un fournisseur pour les paroles (OpenAI ou Claude) : le filtrage des demandes et des résultats générés le réutilisera automatiquement, sans réglage supplémentaire."
        />
      )}
    </AdminPage>
  );
}
