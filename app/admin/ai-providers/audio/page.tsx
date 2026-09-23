import { eq } from "drizzle-orm";
import AdminMusicfulProviderForm from "@/components/admin/AdminMusicfulProviderForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminAudioProviderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const [stored] = await getServiceDb().select().from(audioProviderConfigs).where(eq(audioProviderConfigs.provider, "musicful")).limit(1);
  const query = await searchParams;
  const notice = query.saved
    ? "Configuration Musicful enregistrée."
    : query.removed
      ? "Clé Musicful supprimée."
      : query.test === "ok"
        ? "Connexion Musicful validée."
        : query.test === "failed"
          ? "Échec de connexion : vérifie la clé et la disponibilité de Musicful."
          : query.test === "missing"
            ? "Aucune clé Musicful n’est disponible."
            : undefined;
  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Fournisseur audio"
        title="Génération des chansons audio"
        description="Configure Musicful pour transformer les paroles validées en chansons audio."
      />
      <AdminMusicfulProviderForm
        settings={{
          enabled: stored?.enabled ?? Boolean(process.env.MUSICFUL_API_KEY),
          apiKeyLast4: stored?.apiKeyLast4 ?? (process.env.MUSICFUL_API_KEY ? "env" : null),
          apiBaseUrl: stored?.apiBaseUrl ?? "https://api.musicful.ai",
          defaultModel: stored?.defaultModel ?? "MFV3.0",
          defaultInstrumental: stored?.defaultInstrumental ?? false,
          defaultGender: (stored?.defaultGender as "male" | "female" | "" | null) ?? "",
          requestTimeoutMs: stored?.requestTimeoutMs ?? 60_000,
          pollingIntervalMs: stored?.pollingIntervalMs ?? 5_000,
          maxPollingMinutes: stored?.maxPollingMinutes ?? 10,
          maxRetries: stored?.maxRetries ?? 2,
          allowTextToMusic: stored?.allowTextToMusic ?? true,
          allowLyricsToMusic: stored?.allowLyricsToMusic ?? true,
          allowInstrumental: stored?.allowInstrumental ?? true,
          allowLyricsGenerator: stored?.allowLyricsGenerator ?? true,
          allowVibe: stored?.allowVibe ?? true,
          allowWavConversion: stored?.allowWavConversion ?? true,
          allowMp4Conversion: stored?.allowMp4Conversion ?? true,
          preferredAudioFormat: (stored?.preferredAudioFormat as "native" | "wav" | null) ?? "native",
          strictStyleAdherence: stored?.strictStyleAdherence ?? true,
          maxGenerationsPerUserPerDay: stored?.maxGenerationsPerUserPerDay ?? 5,
          maxGenerationsPerUserPerHour: stored?.maxGenerationsPerUserPerHour ?? 2,
          maxConcurrentJobs: stored?.maxConcurrentJobs ?? 2,
        }}
        account={{
          lastConnectionStatus: stored?.lastConnectionStatus ?? null,
          lastConnectionError: stored?.lastConnectionError ?? null,
          lastTestedAt: stored?.lastTestedAt ?? null,
          providerKeyStatus: stored?.providerKeyStatus ?? null,
          providerCredits: stored?.providerCredits ?? null,
          providerEmail: stored?.providerEmail ?? null,
          providerMemberId: stored?.providerMemberId ?? null,
          providerKeyName: stored?.providerKeyName ?? null,
          providerKeyCreatedAt: stored?.providerKeyCreatedAt ?? null,
          providerLastUsedAt: stored?.providerLastUsedAt ?? null,
        }}
        notice={notice}
        noticeTone={query.test === "failed" || query.test === "missing" ? "error" : query.removed ? "info" : "success"}
        encryptionReady={Boolean(process.env.APP_SECRETS_ENCRYPTION_KEY)}
      />
    </AdminPage>
  );
}
