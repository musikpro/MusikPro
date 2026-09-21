import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import AdminToast from "@/components/admin/AdminToast";
import { removeAnthropicKey, removeOpenAiKey, saveAnthropicSettings, saveOpenAiSettings, testAnthropicConnection, testOpenAiConnection } from "@/app/admin/ai-providers/actions";

type Settings = {
  enabled: boolean;
  apiKeyLast4: string | null;
  defaultModel: string;
  maxOutputTokens: number;
  requestsPerMinute: number;
  lyricsGenerationEnabled: boolean;
  lyricsRewriteEnabled: boolean;
  isDefaultForLyrics: boolean;
};

function FieldInfo({ text }: { text: string }) {
  return (
    <details className="admin-field-info">
      <summary aria-label="Afficher l’aide">
        <Icon i="info" size={14} />
      </summary>
      <p>{text}</p>
    </details>
  );
}

function FieldLabel({ children, help }: { children: React.ReactNode; help: string }) {
  return (
    <span className="admin-field-label">
      <span>{children}</span>
      <FieldInfo text={help} />
    </span>
  );
}

export default function AdminAiProviderForm({
  settings,
  notice,
  noticeTone,
  encryptionReady,
  provider = "openai",
}: {
  settings: Settings;
  notice?: string;
  noticeTone?: "success" | "error" | "info";
  encryptionReady: boolean;
  provider?: "openai" | "anthropic";
}) {
  const isAnthropic = provider === "anthropic";
  const saveAction = isAnthropic ? saveAnthropicSettings : saveOpenAiSettings;
  const testAction = isAnthropic ? testAnthropicConnection : testOpenAiConnection;
  const removeAction = isAnthropic ? removeAnthropicKey : removeOpenAiKey;
  const providerName = isAnthropic ? "Claude / Anthropic" : "OpenAI";
  return (
    <section className="admin-panel admin-editor-card">
      <div>
        <span className="admin-eyebrow">Génération des paroles</span>
        <h2>{providerName}</h2>
        <p>Configure la clé et le modèle utilisés par la génération, la révision et le rallongement.</p>
        <span className={`admin-status ${settings.enabled ? "is-success" : "is-pending"}`}>
          {settings.enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      {notice ? <AdminToast message={notice} tone={noticeTone} /> : null}
      {!encryptionReady ? (
        <div className="admin-secret-setup" role="status">
          <span className="admin-secret-setup-icon">
            <Icon i="shield-check" size={20} />
          </span>
          <div>
            <strong>Protection de la clé à terminer</strong>
            <p>Le champ est bloqué jusqu’à ce que le coffre de chiffrement du serveur soit prêt.</p>
            <ol>
              <li>
                Génère localement un secret avec <code>openssl rand -base64 32</code>.
              </li>
              <li>
                Ajoute-le dans <code>.env.local</code> sous le nom <code>APP_SECRETS_ENCRYPTION_KEY</code>.
              </li>
              <li>Redémarre MusikPro, puis colle la clé {providerName} dans le premier champ ci-dessous.</li>
            </ol>
            <small>Ne colle jamais ces deux clés dans le chat, GitHub ou une variable NEXT_PUBLIC_*.</small>
          </div>
        </div>
      ) : null}
      <form action={saveAction} className="admin-editor-grid">
        <label className="admin-editor-field is-wide">
          <FieldLabel help={`Colle ici la clé secrète créée dans ${isAnthropic ? "Claude Platform" : "OpenAI Platform"}. Le champ masque les caractères pendant la saisie. Après enregistrement, seule la fin de la clé sera affichée.`}>
            Clé API {providerName}
          </FieldLabel>
          <input
            name="apiKey"
            type="password"
            autoComplete="new-password"
            minLength={20}
            maxLength={500}
            disabled={!encryptionReady}
            placeholder={
              settings.apiKeyLast4
                ? `Clé enregistrée ••••${settings.apiKeyLast4} — laisser vide pour conserver`
                : isAnthropic ? "sk-ant-…" : "sk-proj-…"
            }
          />
          <small>
            {encryptionReady
              ? "Champ sécurisé : la clé sera masquée, chiffrée puis retirée du formulaire après l’enregistrement."
              : "Configure d’abord le coffre de chiffrement en suivant les trois étapes ci-dessus."}
          </small>
        </label>
        <label className="admin-editor-field">
          <FieldLabel help={`Activé autorise MusikPro à appeler ${providerName}. Désactivé conserve les réglages mais bloque les appels à ce fournisseur.`}>
            État du fournisseur
          </FieldLabel>
          <AdminSelect
            name="enabled"
            defaultValue={String(settings.enabled)}
            ariaLabel={`État ${providerName}`}
            options={[
              { value: "true", label: "Activé" },
              { value: "false", label: "Désactivé" },
            ]}
          />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Choisis ce fournisseur pour les nouvelles générations, révisions et extensions de paroles. Un seul fournisseur est utilisé à la fois.">
            Fournisseur utilisé pour les paroles
          </FieldLabel>
          <AdminSelect name="isDefaultForLyrics" defaultValue={String(settings.isDefaultForLyrics)} ariaLabel={`Utiliser ${providerName} pour les paroles`} options={[{ value: "true", label: "Utiliser ce fournisseur" }, { value: "false", label: "Ne pas utiliser" }]} />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help={`Identifiant exact du modèle ${providerName} utilisé pour écrire les paroles. Tu peux le modifier sans changer le code de MusikPro.`}>
            Identifiant du modèle
          </FieldLabel>
          <input name="defaultModel" required minLength={1} maxLength={100} defaultValue={settings.defaultModel} />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Longueur maximale autorisée pour une réponse OpenAI. Une valeur plus élevée permet des paroles plus longues mais augmente la consommation.">
            Tokens maximum par réponse
          </FieldLabel>
          <input
            name="maxOutputTokens"
            type="number"
            min="100"
            max="128000"
            defaultValue={settings.maxOutputTokens}
            required
          />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Nombre maximal de demandes de paroles qu’un même utilisateur peut envoyer en une minute. Cette limite protège le budget et évite les abus.">
            Requêtes/minute/utilisateur
          </FieldLabel>
          <input
            name="requestsPerMinute"
            type="number"
            min="1"
            max="120"
            defaultValue={settings.requestsPerMinute}
            required
          />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Autorise ou bloque la création initiale de paroles à partir de l’occasion, de l’histoire, du destinataire, du style, de l’ambiance, de la langue et de la voix.">
            Génération de paroles
          </FieldLabel>
          <AdminSelect
            name="lyricsGenerationEnabled"
            defaultValue={String(settings.lyricsGenerationEnabled)}
            ariaLabel="Génération de paroles"
            options={[
              { value: "true", label: "Autorisée" },
              { value: "false", label: "Désactivée" },
            ]}
          />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help={`Autorise ${providerName} à réviser, reformuler ou rallonger des paroles déjà générées sans affecter la génération initiale.`}>
            Révision et rallongement
          </FieldLabel>
          <AdminSelect
            name="lyricsRewriteEnabled"
            defaultValue={String(settings.lyricsRewriteEnabled)}
            ariaLabel="Révision de paroles"
            options={[
              { value: "true", label: "Autorisés" },
              { value: "false", label: "Désactivés" },
            ]}
          />
        </label>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} />
            Enregistrer
          </button>
        </div>
      </form>
      <div className="admin-editor-actions">
        <form action={testAction}>
          <button type="submit">
            <Icon i="activity" size={17} />
            Tester la connexion
          </button>
        </form>
        {settings.apiKeyLast4 ? (
          <form action={removeAction}>
            <button type="submit" className="is-danger">
              <Icon i="trash-2" size={17} />
              Supprimer la clé
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
