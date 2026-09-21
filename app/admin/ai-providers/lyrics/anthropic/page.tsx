import { eq } from "drizzle-orm";
import AdminAiProviderForm from "@/components/admin/AdminAiProviderForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AnthropicLyricsProviderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [stored] = await getServiceDb().select().from(aiProviderConfigs).where(eq(aiProviderConfigs.provider, "anthropic")).limit(1);
  const query = await searchParams;
  const notice = query.saved ? "Configuration Claude enregistrée." : query.removed ? "Clé Claude supprimée." : query.test === "ok" ? "Connexion Claude validée avec le modèle configuré." : query.test === "failed" ? "Échec de connexion : vérifie la clé, les crédits et le modèle Claude." : query.test === "missing" ? "Aucune clé Anthropic n’est disponible." : undefined;
  return <AdminPage>
    <AdminBackLink href="/admin/ai-providers/lyrics" label="Fournisseurs de paroles" />
    <AdminPageHeader eyebrow="Fournisseur de paroles" title="Claude / Anthropic" description="Configure l’API Claude et choisis éventuellement ce fournisseur pour les paroles." />
    <AdminAiProviderForm provider="anthropic" settings={{ enabled: stored?.enabled ?? Boolean(process.env.ANTHROPIC_API_KEY), apiKeyLast4: stored?.apiKeyLast4 ?? (process.env.ANTHROPIC_API_KEY ? "env" : null), defaultModel: stored?.defaultModel ?? process.env.ANTHROPIC_DEFAULT_MODEL ?? "claude-haiku-4-5-20251001", maxOutputTokens: stored?.maxOutputTokens ?? (Number(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS) || 4000), requestsPerMinute: stored?.requestsPerMinute ?? 10, lyricsGenerationEnabled: stored?.lyricsGenerationEnabled ?? true, lyricsRewriteEnabled: stored?.lyricsRewriteEnabled ?? true, isDefaultForLyrics: stored?.isDefaultForLyrics ?? false }} notice={notice} noticeTone={query.test === "failed" || query.test === "missing" ? "error" : query.removed ? "info" : "success"} encryptionReady={Boolean(process.env.APP_SECRETS_ENCRYPTION_KEY)} />
  </AdminPage>;
}
