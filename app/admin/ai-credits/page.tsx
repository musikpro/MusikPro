import { eq } from "drizzle-orm";
import AdminAiCreditsPanel from "@/components/admin/AdminAiCreditsPanel";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getAnthropicAdminKeyStatus, getAnthropicMonthlySpend, AnthropicAdminApiError } from "@/lib/ai/anthropic-usage";

export default async function AdminAiCreditsPage() {
  await requireAdmin();

  const [musicful] = await getServiceDb()
    .select()
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, "musicful"))
    .limit(1);

  const anthropicKeyStatus = await getAnthropicAdminKeyStatus();
  let anthropicSpend: {
    amountUsd: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
    dailySpend: { day: string; amountUsd: number }[];
  } | null = null;
  let anthropicSpendError: string | null = null;
  if (anthropicKeyStatus.configured) {
    try {
      const spend = await getAnthropicMonthlySpend();
      if (spend.configured) {
        anthropicSpend = {
          amountUsd: spend.amountUsd,
          currency: spend.currency,
          periodStart: spend.periodStart.toISOString(),
          periodEnd: spend.periodEnd.toISOString(),
          dailySpend: spend.dailySpend,
        };
      }
    } catch (error) {
      anthropicSpendError =
        error instanceof AnthropicAdminApiError
          ? "Impossible de récupérer les dépenses Anthropic : vérifie que l’Admin API Key est valide et toujours active."
          : "Impossible de récupérer les dépenses Anthropic pour le moment.";
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Finance"
        title="Crédits fournisseurs IA"
        description="Consulte tes crédits Musicful et tes dépenses Anthropic sans quitter MusikPro."
      />
      <AdminAiCreditsPanel
        musicful={{
          configured: Boolean(musicful?.apiKeyLast4),
          credits: musicful?.providerCredits ?? null,
          lastTestedAt: musicful?.lastTestedAt ?? null,
        }}
        anthropic={{
          configured: anthropicKeyStatus.configured,
          last4: anthropicKeyStatus.last4,
          spend: anthropicSpend,
          spendError: anthropicSpendError,
        }}
      />
    </AdminPage>
  );
}
