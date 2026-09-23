import AdminSelect from "@/components/admin/AdminSelect";
import AdminSecretField from "@/components/admin/AdminSecretField";
import Icon from "@/components/banani/Icon";
import AdminToast from "@/components/admin/AdminToast";
import { removeMusicfulKey, saveMusicfulSettings, testMusicfulConnection } from "@/app/admin/ai-providers/actions";

type MusicfulSettings = {
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
  allowTextToMusic: boolean;
  allowLyricsToMusic: boolean;
  allowInstrumental: boolean;
  allowLyricsGenerator: boolean;
  allowVibe: boolean;
  allowWavConversion: boolean;
  allowMp4Conversion: boolean;
  maxGenerationsPerUserPerDay: number;
  maxGenerationsPerUserPerHour: number;
  maxConcurrentJobs: number;
};

type MusicfulAccountInfo = {
  lastConnectionStatus: string | null;
  lastConnectionError: string | null;
  lastTestedAt: Date | string | null;
  providerKeyStatus: number | null;
  providerCredits: string | null;
  providerEmail: string | null;
  providerMemberId: string | null;
  providerKeyName: string | null;
  providerKeyCreatedAt: string | null;
  providerLastUsedAt: string | null;
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

const boolOptions = (onLabel: string, offLabel: string) => [
  { value: "true", label: onLabel },
  { value: "false", label: offLabel },
];

export default function AdminMusicfulProviderForm({
  settings,
  account,
  notice,
  noticeTone,
  encryptionReady,
}: {
  settings: MusicfulSettings;
  account: MusicfulAccountInfo;
  notice?: string;
  noticeTone?: "success" | "error" | "info";
  encryptionReady: boolean;
}) {
  return (
    <section className="admin-panel admin-editor-card">
      <div>
        <span className="admin-eyebrow">Génération audio</span>
        <h2>Musicful</h2>
        <p>Transforme les paroles validées en chansons audio via l’API Musicful.</p>
        <span className={`admin-status ${settings.enabled && settings.apiKeyLast4 ? "is-success" : "is-pending"}`}>
          {settings.enabled && settings.apiKeyLast4 ? "Actif" : "Inactif"}
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
              <li>Redémarre MusikPro, puis colle la clé Musicful dans le premier champ ci-dessous.</li>
            </ol>
            <small>Ne colle jamais ces deux clés dans le chat, GitHub ou une variable NEXT_PUBLIC_*.</small>
          </div>
        </div>
      ) : null}

      {account.lastTestedAt ? (
        <dl className="admin-info-grid">
          <div>
            <dt>Statut de connexion</dt>
            <dd>{account.lastConnectionStatus === "connected" ? "Connecté" : `Erreur${account.lastConnectionError ? ` (${account.lastConnectionError})` : ""}`}</dd>
          </div>
          {account.providerCredits ? (
            <div>
              <dt>Crédits/droits restants</dt>
              <dd>{account.providerCredits}</dd>
            </div>
          ) : null}
          {account.providerEmail ? (
            <div>
              <dt>Compte Musicful</dt>
              <dd>{account.providerEmail}</dd>
            </div>
          ) : null}
          {account.providerKeyName ? (
            <div>
              <dt>Nom de la clé</dt>
              <dd>{account.providerKeyName}</dd>
            </div>
          ) : null}
          {account.providerMemberId ? (
            <div>
              <dt>Identifiant membre</dt>
              <dd>{account.providerMemberId}</dd>
            </div>
          ) : null}
          <div>
            <dt>Dernier test</dt>
            <dd>{new Date(account.lastTestedAt).toLocaleString("fr-FR")}</dd>
          </div>
        </dl>
      ) : null}

      <form action={saveMusicfulSettings} className="admin-editor-grid">
        <label className="admin-editor-field is-wide">
          <FieldLabel help="Colle ici la clé secrète créée dans ton espace Musicful (x-api-key). Le champ reste verrouillé une fois configuré ; clique sur « Modifier » pour la remplacer.">
            Clé API Musicful
          </FieldLabel>
          <AdminSecretField
            name="apiKey"
            configured={Boolean(settings.apiKeyLast4)}
            placeholder={settings.apiKeyLast4 ? `Clé enregistrée ••••${settings.apiKeyLast4} — laisser vide pour conserver` : "Saisir la clé API Musicful"}
          />
          <small>
            {encryptionReady
              ? "Champ sécurisé : la clé sera masquée, chiffrée puis retirée du formulaire après l’enregistrement."
              : "Configure d’abord le coffre de chiffrement en suivant les trois étapes ci-dessus."}
          </small>
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Activé autorise MusikPro à appeler Musicful pour générer des chansons. Désactivé conserve les réglages mais bloque les appels.">
            État du fournisseur
          </FieldLabel>
          <AdminSelect name="enabled" defaultValue={String(settings.enabled)} ariaLabel="État Musicful" options={boolOptions("Activé", "Désactivé")} />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Modèle Musicful utilisé par défaut pour les nouvelles générations. MFV3.0 est la version recommandée.">
            Modèle par défaut
          </FieldLabel>
          <AdminSelect
            name="defaultModel"
            defaultValue={settings.defaultModel}
            ariaLabel="Modèle Musicful par défaut"
            options={["MFV3.0", "MFV2.0", "MFV1.5X", "MFV1.5", "MFV1.0"].map((value) => ({ value, label: value }))}
          />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Voix par défaut proposée à l’utilisateur pour ses chansons. « Automatique » laisse Musicful choisir.">
            Voix par défaut
          </FieldLabel>
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
          <FieldLabel help="Génère une version instrumentale par défaut (sans paroles chantées) plutôt qu’une version avec voix.">
            Instrumental par défaut
          </FieldLabel>
          <AdminSelect name="defaultInstrumental" defaultValue={String(settings.defaultInstrumental)} ariaLabel="Instrumental par défaut" options={boolOptions("Instrumental", "Avec voix/paroles")} />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Délai maximal (en millisecondes) accordé à chaque appel HTTP vers Musicful avant abandon.">
            Timeout de requête (ms)
          </FieldLabel>
          <input name="requestTimeoutMs" type="number" min="5000" max="120000" step="1000" defaultValue={settings.requestTimeoutMs} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Fréquence à laquelle MusikPro interroge Musicful pour connaître l’avancement d’une génération en cours.">
            Intervalle de sondage (ms)
          </FieldLabel>
          <input name="pollingIntervalMs" type="number" min="2000" max="30000" step="500" defaultValue={settings.pollingIntervalMs} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Durée maximale d’attente avant qu’une génération soit considérée comme bloquée.">
            Attente maximale (min)
          </FieldLabel>
          <input name="maxPollingMinutes" type="number" min="1" max="60" defaultValue={settings.maxPollingMinutes} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Nombre de nouvelles tentatives automatiques pour une erreur réseau ou serveur temporaire (429, 500, 502, 503, 504).">
            Tentatives automatiques
          </FieldLabel>
          <input name="maxRetries" type="number" min="0" max="5" defaultValue={settings.maxRetries} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Nombre maximal de chansons qu’un même utilisateur peut générer par jour.">Générations max/jour/utilisateur</FieldLabel>
          <input name="maxGenerationsPerUserPerDay" type="number" min="1" max="1000" defaultValue={settings.maxGenerationsPerUserPerDay} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Nombre maximal de chansons qu’un même utilisateur peut générer par heure.">Générations max/heure/utilisateur</FieldLabel>
          <input name="maxGenerationsPerUserPerHour" type="number" min="1" max="1000" defaultValue={settings.maxGenerationsPerUserPerHour} required />
        </label>
        <label className="admin-editor-field">
          <FieldLabel help="Nombre maximal de générations Musicful pouvant être en cours simultanément pour l’ensemble du SaaS.">Générations simultanées max</FieldLabel>
          <input name="maxConcurrentJobs" type="number" min="1" max="50" defaultValue={settings.maxConcurrentJobs} required />
        </label>

        <div className="admin-editor-field is-wide">
          <span className="admin-field-label">
            <span>Fonctionnalités autorisées</span>
          </span>
          <div className="admin-check-grid">
            <label className="admin-check-control">
              <input type="checkbox" name="allowTextToMusic" defaultChecked={settings.allowTextToMusic} />
              <span>Texte vers musique</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowLyricsToMusic" defaultChecked={settings.allowLyricsToMusic} />
              <span>Paroles vers musique</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowInstrumental" defaultChecked={settings.allowInstrumental} />
              <span>Musique instrumentale</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowLyricsGenerator" defaultChecked={settings.allowLyricsGenerator} />
              <span>Générateur de paroles Musicful</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowVibe" defaultChecked={settings.allowVibe} />
              <span>Vibe (voix/ambiance)</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowWavConversion" defaultChecked={settings.allowWavConversion} />
              <span>Conversion WAV</span>
            </label>
            <label className="admin-check-control">
              <input type="checkbox" name="allowMp4Conversion" defaultChecked={settings.allowMp4Conversion} />
              <span>Conversion MP4</span>
            </label>
          </div>
        </div>

        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} />
            Enregistrer
          </button>
        </div>
      </form>
      <div className="admin-editor-actions">
        <form action={testMusicfulConnection}>
          <button type="submit">
            <Icon i="activity" size={17} />
            Tester la connexion
          </button>
        </form>
        {settings.apiKeyLast4 ? (
          <form action={removeMusicfulKey}>
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
