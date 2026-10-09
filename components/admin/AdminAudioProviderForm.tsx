"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSecretField from "@/components/admin/AdminSecretField";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import {
  regenerateAudioProviderWebhook,
  removeAudioProviderKey,
  saveAudioProviderSettings,
  testAudioProviderConnection,
} from "@/app/admin/ai-providers/audio-actions";

export type AudioProviderFormSettings = {
  enabled: boolean;
  apiKeyLast4: string | null;
  apiBaseUrl: string;
  defaultModel: string;
  defaultInstrumental: boolean;
  defaultGender: "male" | "female" | "";
  requestTimeoutMs: number;
  pollingIntervalMs: number;
  maxPollingMinutes: number;
  maxRetries: number;
  allowLyricsToMusic: boolean;
  strictStyleAdherence: boolean;
  maxGenerationsPerUserPerDay: number;
  maxGenerationsPerUserPerHour: number;
  maxConcurrentJobs: number;
  versionsPerGeneration: number;
  redirectDelaySeconds: number;
};

const boolOptions = (onLabel: string, offLabel: string) => [
  { value: "true", label: onLabel },
  { value: "false", label: offLabel },
];

function NumberField({
  name,
  label,
  value,
  min,
  max,
  hint,
}: {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
}) {
  return (
    <label className="admin-editor-field">
      <span>{label}</span>
      <input name={name} type="number" min={min} max={max} defaultValue={value} required />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

/**
 * Generic settings box of an audio provider other than Musicful. Everything here is stored in
 * `audio_provider_configs` (API key encrypted) and reaches the provider's adapter at runtime — see
 * lib/ai/audio-providers/.
 */
export default function AdminAudioProviderForm({
  providerId,
  label,
  description,
  implemented,
  settings,
  lastTest,
  encryptionReady,
  webhook,
  replicate,
}: {
  providerId: string;
  label: string;
  description: string;
  implemented: boolean;
  settings: AudioProviderFormSettings;
  lastTest: { status: string | null; error: string | null; at: Date | string | null; summary: string | null };
  encryptionReady: boolean;
  /** Set for providers that call back: `url` is null until a token exists; `httpsReady` = public HTTPS origin configured. */
  webhook?: { url: string | null; httpsReady: boolean };
  /** Replicate only: fixed host, model version instead of a model name, MP3-only badge, durable storage + usage panels. */
  replicate?: {
    storageReady: boolean;
    usage: { predictions: number; succeeded: number; failed: number; gpuSeconds: number; last30Days: number };
  };
}) {
  return (
    <section className="admin-panel admin-editor-card">
      <div>
        <span className="admin-eyebrow">Génération audio</span>
        <h2>{label}</h2>
        <p>{description}</p>
        <span className={`admin-status ${settings.enabled && settings.apiKeyLast4 ? "is-success" : "is-pending"}`}>
          {settings.enabled && settings.apiKeyLast4 ? "Actif" : "Inactif"}
        </span>
      </div>

      {replicate ? (
        <>
          <div className="admin-status is-success" role="status">
            Sortie : MP3 uniquement
          </div>
          {replicate.storageReady ? null : (
            <div className="admin-secret-setup" role="status">
              <span className="admin-secret-setup-icon">
                <Icon i="shield-check" size={20} />
              </span>
              <div>
                <strong>Stockage durable du MP3 non configuré</strong>
                <p>
                  Les liens Replicate expirent après environ une heure : sans Cloudinary (
                  <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>,{" "}
                  <code>CLOUDINARY_API_SECRET</code>), aucune chanson Replicate ne peut être livrée.
                </p>
              </div>
            </div>
          )}
          <dl className="admin-info-grid">
            <div>
              <dt>Prédictions (total)</dt>
              <dd>{replicate.usage.predictions}</dd>
            </div>
            <div>
              <dt>Réussies / échouées</dt>
              <dd>
                {replicate.usage.succeeded} / {replicate.usage.failed}
              </dd>
            </div>
            <div>
              <dt>Temps GPU cumulé</dt>
              <dd>{Math.round(replicate.usage.gpuSeconds)} s</dd>
            </div>
            <div>
              <dt>Prédictions sur 30 jours</dt>
              <dd>{replicate.usage.last30Days}</dd>
            </div>
          </dl>
          <small>
            Le coût en dollars se lit sur replicate.com/account/billing (facturé au temps GPU réel) ; MusikPro ne
            l’estime pas pour ne pas afficher un montant inventé.
          </small>
        </>
      ) : null}

      {implemented ? null : (
        <div className="admin-source-notice" role="status">
          <Icon i="wrench" size={18} />
          <div>
            <strong>Intégration de l’API à terminer</strong>
            <p>
              Les réglages ci-dessous sont déjà enregistrés et chiffrés. Pour brancher la génération, complète les
              méthodes <code>submit</code> et <code>getTask</code> de <code>lib/ai/audio-providers/musicgpt.ts</code>,
              puis passe <code>implemented</code> à <code>true</code> dans <code>catalog.ts</code>. Tant que ce n’est
              pas fait, ce fournisseur ne peut pas être choisi comme fournisseur actif.
            </p>
          </div>
        </div>
      )}

      {encryptionReady ? null : (
        <div className="admin-secret-setup" role="status">
          <span className="admin-secret-setup-icon">
            <Icon i="shield-check" size={20} />
          </span>
          <div>
            <strong>Protection de la clé à terminer</strong>
            <p>
              Ajoute <code>APP_SECRETS_ENCRYPTION_KEY</code> dans <code>.env.local</code> (
              <code>openssl rand -base64 32</code>) puis redémarre MusikPro avant de coller la clé.
            </p>
          </div>
        </div>
      )}

      {lastTest.at ? (
        <dl className="admin-info-grid">
          <div>
            <dt>Statut de connexion</dt>
            <dd>
              {lastTest.status === "connected" ? "Connecté" : `Erreur${lastTest.error ? ` (${lastTest.error})` : ""}`}
            </dd>
          </div>
          {lastTest.summary ? (
            <div>
              <dt>Compte</dt>
              <dd>{lastTest.summary}</dd>
            </div>
          ) : null}
          <div>
            <dt>Dernier test</dt>
            <dd>{new Date(lastTest.at).toLocaleString("fr-FR")}</dd>
          </div>
        </dl>
      ) : null}

      <AdminActionForm action={saveAudioProviderSettings} className="admin-editor-grid">
        <input type="hidden" name="provider" value={providerId} />
        <label className="admin-editor-field is-wide">
          <span>Clé API {label}</span>
          <AdminSecretField
            name="apiKey"
            configured={Boolean(settings.apiKeyLast4)}
            placeholder={
              settings.apiKeyLast4
                ? `Clé enregistrée ••••${settings.apiKeyLast4} — laisser vide pour conserver`
                : `Saisir la clé API ${label}`
            }
          />
          <small>La clé est chiffrée côté serveur et n’est jamais renvoyée au navigateur.</small>
        </label>
        <label className="admin-editor-field is-wide">
          <span>URL de l’API</span>
          <input
            name="apiBaseUrl"
            type="url"
            defaultValue={settings.apiBaseUrl}
            placeholder="https://api.exemple.com"
            maxLength={300}
            readOnly={Boolean(replicate)}
          />
        </label>
        <label className="admin-editor-field">
          <span>{replicate ? "Version du modèle fishaudio/ace-step-1.5" : "Modèle par défaut"}</span>
          <input
            name="defaultModel"
            defaultValue={settings.defaultModel}
            maxLength={120}
            placeholder="ex. v7"
            readOnly={Boolean(replicate)}
          />
          {replicate ? (
            <small>
              Lecture seule : la version ne change que par le panneau « Versions ACE-Step » (vérification, test,
              approbation, activation).
            </small>
          ) : null}
        </label>
        <label className="admin-editor-field">
          <span>État du fournisseur</span>
          <AdminSelect
            name="enabled"
            defaultValue={String(settings.enabled)}
            ariaLabel={`État ${label}`}
            options={boolOptions("Activé", "Désactivé")}
          />
        </label>
        <label className="admin-editor-field">
          <span>Voix par défaut</span>
          <AdminSelect
            name="defaultGender"
            defaultValue={settings.defaultGender}
            ariaLabel="Voix par défaut"
            options={[
              { value: "", label: "Automatique" },
              { value: "male", label: "Masculine" },
              { value: "female", label: "Féminine" },
            ]}
          />
        </label>
        <label className="admin-editor-field">
          <span>Instrumental par défaut</span>
          <AdminSelect
            name="defaultInstrumental"
            defaultValue={String(settings.defaultInstrumental)}
            ariaLabel="Instrumental par défaut"
            options={boolOptions("Oui", "Non — avec chant")}
          />
        </label>
        <NumberField
          name="requestTimeoutMs"
          label="Délai d’une requête (ms)"
          value={settings.requestTimeoutMs}
          min={5000}
          max={120000}
        />
        <NumberField
          name="pollingIntervalMs"
          label="Intervalle de suivi (ms)"
          value={settings.pollingIntervalMs}
          min={2000}
          max={30000}
        />
        <NumberField
          name="maxPollingMinutes"
          label="Attente maximale (min)"
          value={settings.maxPollingMinutes}
          min={1}
          max={60}
          hint="Au-delà, la génération est marquée en échec."
        />
        <NumberField name="maxRetries" label="Nouvelles tentatives" value={settings.maxRetries} min={0} max={5} />
        <NumberField
          name="maxGenerationsPerUserPerHour"
          label="Générations / utilisateur / heure"
          value={settings.maxGenerationsPerUserPerHour}
          min={1}
          max={1000}
        />
        <NumberField
          name="maxGenerationsPerUserPerDay"
          label="Générations / utilisateur / jour"
          value={settings.maxGenerationsPerUserPerDay}
          min={1}
          max={1000}
        />
        <NumberField
          name="maxConcurrentJobs"
          label="Générations simultanées"
          value={settings.maxConcurrentJobs}
          min={1}
          max={50}
        />
        <NumberField
          name="versionsPerGeneration"
          label="Versions par génération"
          value={settings.versionsPerGeneration}
          min={1}
          max={3}
          hint={
            replicate
              ? "Chaque version est une prédiction Replicate facturée séparément ; le client paie toujours 2 crédits."
              : "Le coût reste de 2 crédits par génération."
          }
        />
        <NumberField
          name="redirectDelaySeconds"
          label="Délai de redirection (s)"
          value={settings.redirectDelaySeconds}
          min={10}
          max={1800}
        />
        <div className="admin-check-grid is-wide">
          <label className="admin-check-control">
            <input type="checkbox" name="allowLyricsToMusic" defaultChecked={settings.allowLyricsToMusic} />
            <span>Paroles vers musique</span>
          </label>
          <label className="admin-check-control">
            <input type="checkbox" name="strictStyleAdherence" defaultChecked={settings.strictStyleAdherence} />
            <span>Respect strict du style musical</span>
          </label>
        </div>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} />
            Enregistrer
          </button>
        </div>
      </AdminActionForm>

      {webhook ? (
        <div className="admin-editor-grid">
          <label className="admin-editor-field is-wide">
            <span>Lien webhook (reçoit les chansons terminées)</span>
            <input readOnly value={webhook.url ?? ""} placeholder="Aucun lien généré" />
            <small>
              {webhook.httpsReady
                ? "Secret : ne le partage pas. Sans webhook, MusikPro suit quand même les chansons par interrogation régulière."
                : "Configure NEXT_PUBLIC_APP_URL avec l’adresse HTTPS publique du SaaS : le fournisseur refuse les liens non HTTPS."}
            </small>
          </label>
          <AdminActionForm action={regenerateAudioProviderWebhook}>
            <input type="hidden" name="provider" value={providerId} />
            <div className="admin-editor-actions">
              <button type="submit" disabled={!encryptionReady}>
                <Icon i="refresh-cw" size={17} />
                {webhook.url ? "Régénérer le lien" : "Générer le lien"}
              </button>
            </div>
          </AdminActionForm>
        </div>
      ) : null}

      <div className="admin-editor-actions">
        <AdminActionForm action={testAudioProviderConnection}>
          <input type="hidden" name="provider" value={providerId} />
          <button type="submit">
            <Icon i="activity" size={17} />
            Tester la connexion
          </button>
        </AdminActionForm>
        {settings.apiKeyLast4 ? (
          <AdminActionForm action={removeAudioProviderKey}>
            <input type="hidden" name="provider" value={providerId} />
            <button type="submit" className="is-danger">
              <Icon i="trash-2" size={17} />
              Supprimer la clé
            </button>
          </AdminActionForm>
        ) : null}
      </div>
    </section>
  );
}
