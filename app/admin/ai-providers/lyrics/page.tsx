import { eq } from "drizzle-orm";
import AdminAiProviderForm from "@/components/admin/AdminAiProviderForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLyricsProviderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [stored] = await getServiceDb()
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "openai"))
    .limit(1);
  const query = await searchParams;
  const notice = query.saved
    ? "Configuration enregistrée."
    : query.removed
      ? "Clé supprimée et fournisseur désactivé."
      : query.test === "ok"
        ? "Connexion OpenAI validée avec le modèle configuré."
        : query.test === "failed"
          ? "Échec de connexion : vérifie la clé et l’identifiant du modèle."
          : query.test === "missing"
            ? "Aucune clé OpenAI n’est disponible."
            : undefined;
  const noticeTone = query.test === "failed" || query.test === "missing" ? "error" : query.removed ? "info" : "success";
  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Fournisseur de paroles"
        title="Génération des paroles"
        description="Réglages exclusivement utilisés pour créer, réviser et rallonger les paroles."
      />
      <AdminAiProviderForm
        settings={{
          enabled: stored?.enabled ?? Boolean(process.env.OPENAI_API_KEY),
          apiKeyLast4: stored?.apiKeyLast4 ?? (process.env.OPENAI_API_KEY ? "env" : null),
          defaultModel: stored?.defaultModel ?? process.env.OPENAI_DEFAULT_MODEL ?? "gpt-5.6-terra",
          maxOutputTokens: stored?.maxOutputTokens ?? (Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 4000),
          requestsPerMinute: stored?.requestsPerMinute ?? 10,
          lyricsGenerationEnabled: stored?.lyricsGenerationEnabled ?? true,
          lyricsRewriteEnabled: stored?.lyricsRewriteEnabled ?? true,
        }}
        notice={notice}
        noticeTone={noticeTone}
        encryptionReady={Boolean(process.env.APP_SECRETS_ENCRYPTION_KEY)}
      />
    </AdminPage>
  );
}
