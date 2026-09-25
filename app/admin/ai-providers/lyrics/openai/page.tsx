import { eq } from "drizzle-orm";
import AdminAiProviderForm from "@/components/admin/AdminAiProviderForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function OpenAiLyricsProviderPage() {
  await requireAdmin();
  const [stored] = await getServiceDb()
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "openai"))
    .limit(1);
  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers/lyrics" label="Fournisseurs de paroles" />
      <AdminPageHeader
        eyebrow="Fournisseur de paroles"
        title="OpenAI / ChatGPT"
        description="Configure OpenAI et choisis éventuellement ce fournisseur pour les paroles."
      />
      <AdminAiProviderForm
        provider="openai"
        settings={{
          enabled: stored?.enabled ?? Boolean(process.env.OPENAI_API_KEY),
          apiKeyLast4: stored?.apiKeyLast4 ?? (process.env.OPENAI_API_KEY ? "env" : null),
          defaultModel: stored?.defaultModel ?? process.env.OPENAI_DEFAULT_MODEL ?? "gpt-5.6-terra",
          maxOutputTokens: stored?.maxOutputTokens ?? (Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 4000),
          requestsPerMinute: stored?.requestsPerMinute ?? 10,
          lyricsGenerationEnabled: stored?.lyricsGenerationEnabled ?? true,
          lyricsRewriteEnabled: stored?.lyricsRewriteEnabled ?? true,
          isDefaultForLyrics: stored?.isDefaultForLyrics ?? true,
        }}
        encryptionReady={Boolean(process.env.APP_SECRETS_ENCRYPTION_KEY)}
      />
    </AdminPage>
  );
}
