import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminAudioProviderForm from "@/components/admin/AdminAudioProviderForm";
import AdminMusicfulProviderForm from "@/components/admin/AdminMusicfulProviderForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import Icon from "@/components/banani/Icon";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { AUDIO_PROVIDERS, getAudioProviderDefinition } from "@/lib/ai/audio-providers/catalog";
import { getActiveAudioProviderId } from "@/lib/ai/audio-providers/active";
import { isCloudinaryConfigured } from "@/lib/storage/cloudinary";
import { getAudioWebhookUrl } from "@/lib/ai/audio-providers/webhook";
import { setActiveAudioProvider } from "../audio-actions";

export default async function AdminAudioProviderPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(audioProviderConfigs);
  const stored = rows.find((row) => row.provider === "musicful");
  const activeId = await getActiveAudioProviderId();
  const activeDefinition = getAudioProviderDefinition(activeId);
  const encryptionReady = Boolean(process.env.APP_SECRETS_ENCRYPTION_KEY);
  const otherProviders = AUDIO_PROVIDERS.filter((provider) => provider.id !== "musicful");
  const webhookUrls = Object.fromEntries(
    await Promise.all(otherProviders.map(async (provider) => [provider.id, await getAudioWebhookUrl(provider.id)] as const)),
  );
  const httpsReady = /^https:/.test(process.env.PAYMENT_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "");
  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader
        eyebrow="Fournisseur audio"
        title="Génération des chansons audio"
        description="Choisis le fournisseur qui transforme les paroles validées en chansons audio, et configure chacun d’eux séparément."
      />
      <AdminTabs
        ariaLabel="Fournisseurs de génération audio"
        tabs={[
          { id: "active", label: "Fournisseur actif" },
          { id: "musicful", label: "Musicful" },
          ...otherProviders.map((provider) => ({ id: provider.id, label: provider.label })),
        ]}
      >
        <AdminTabPanel id="active">
          <section className="admin-panel admin-editor-card">
            <div>
              <span className="admin-eyebrow">Routage des générations</span>
              <h2>Fournisseur actif</h2>
              <p>
                Les nouvelles chansons sont envoyées à ce fournisseur. Les chansons déjà générées restent suivies par le
                fournisseur qui les a créées.
              </p>
              <span className="admin-status is-success">{activeDefinition.label}</span>
            </div>
            <AdminActionForm action={setActiveAudioProvider} className="admin-editor-grid">
              <label className="admin-editor-field">
                <span>Recevoir les nouvelles générations</span>
                <AdminSelect
                  name="provider"
                  ariaLabel="Fournisseur audio actif"
                  defaultValue={activeId}
                  options={AUDIO_PROVIDERS.map((provider) => ({
                    value: provider.id,
                    label: provider.implemented ? provider.label : `${provider.label} (intégration à faire)`,
                  }))}
                />
              </label>
              <div className="admin-editor-actions">
                <button type="submit">
                  <Icon i="check" size={17} />
                  Définir comme fournisseur actif
                </button>
              </div>
            </AdminActionForm>
            <ul className="admin-fx-providers">
              {AUDIO_PROVIDERS.map((provider) => {
                const row = rows.find((item) => item.provider === provider.id);
                const configured =
                  Boolean(row?.apiKeyLast4) || (provider.id === "musicful" && Boolean(process.env.MUSICFUL_API_KEY));
                return (
                  <li key={provider.id}>
                    <strong>
                      {provider.label} —{" "}
                      {provider.id === activeId ? "actif" : configured && row?.enabled ? "prêt" : "inactif"}
                    </strong>
                    <span>
                      {provider.implemented
                        ? provider.description
                        : "Emplacement prêt : l’intégration de l’API reste à faire."}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="musicful">
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
              preferredAudioFormat: (stored?.preferredAudioFormat as "native" | "wav" | null) ?? "native",
              strictStyleAdherence: stored?.strictStyleAdherence ?? true,
              maxGenerationsPerUserPerDay: stored?.maxGenerationsPerUserPerDay ?? 5,
              maxGenerationsPerUserPerHour: stored?.maxGenerationsPerUserPerHour ?? 2,
              maxConcurrentJobs: stored?.maxConcurrentJobs ?? 2,
              versionsPerGeneration: stored?.versionsPerGeneration ?? 1,
              redirectDelaySeconds: stored?.redirectDelaySeconds ?? 180,
              keepExtraGeneratedVariant: stored?.keepExtraGeneratedVariant ?? true,
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
            encryptionReady={encryptionReady}
            mp3TranscodingReady={isCloudinaryConfigured()}
          />
        </AdminTabPanel>
        {otherProviders.map((provider) => {
          const row = rows.find((item) => item.provider === provider.id);
          return (
            <AdminTabPanel key={provider.id} id={provider.id}>
              <AdminAudioProviderForm
                providerId={provider.id}
                label={provider.label}
                description={provider.description}
                implemented={provider.implemented}
                encryptionReady={encryptionReady}
                webhook={{ url: webhookUrls[provider.id] ?? null, httpsReady }}
                settings={{
                  enabled: row?.enabled ?? false,
                  apiKeyLast4: row?.apiKeyLast4 ?? null,
                  apiBaseUrl: row?.apiBaseUrl ?? provider.defaults.apiBaseUrl,
                  defaultModel: row?.defaultModel ?? provider.defaults.model,
                  defaultInstrumental: row?.defaultInstrumental ?? false,
                  defaultGender: (row?.defaultGender as "male" | "female" | "" | null) ?? "",
                  requestTimeoutMs: row?.requestTimeoutMs ?? 60_000,
                  pollingIntervalMs: row?.pollingIntervalMs ?? 5_000,
                  maxPollingMinutes: row?.maxPollingMinutes ?? 10,
                  maxRetries: row?.maxRetries ?? 2,
                  allowLyricsToMusic: row?.allowLyricsToMusic ?? true,
                  strictStyleAdherence: row?.strictStyleAdherence ?? true,
                  maxGenerationsPerUserPerDay: row?.maxGenerationsPerUserPerDay ?? 5,
                  maxGenerationsPerUserPerHour: row?.maxGenerationsPerUserPerHour ?? 2,
                  maxConcurrentJobs: row?.maxConcurrentJobs ?? 2,
                  versionsPerGeneration: row?.versionsPerGeneration ?? 1,
                  redirectDelaySeconds: row?.redirectDelaySeconds ?? 180,
                }}
                lastTest={{
                  status: row?.lastConnectionStatus ?? null,
                  error: row?.lastConnectionError ?? null,
                  at: row?.lastTestedAt ?? null,
                  summary: row?.providerCredits ?? null,
                }}
              />
            </AdminTabPanel>
          );
        })}
      </AdminTabs>
    </AdminPage>
  );
}
