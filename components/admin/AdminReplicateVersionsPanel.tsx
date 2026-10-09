import AdminActionForm from "@/components/admin/AdminActionForm";
import Icon from "@/components/banani/Icon";
import {
  activateReplicateVersion,
  approveReplicateVersion,
  checkReplicateVersions,
  finishReplicateProbe,
  rollbackReplicateVersion,
  validateReplicateVersion,
} from "@/app/admin/ai-providers/replicate-version-actions";
import type { VersionOverview } from "@/lib/ai/audio-providers/replicate-versions";

const STATUS_LABEL: Record<string, string> = {
  detected: "Détectée",
  tested: "Testée",
  approved: "Approuvée",
  blocked: "Bloquée",
  superseded: "Remplacée",
  rolled_back: "Retirée (retour arrière)",
};
const COMPAT_LABEL: Record<string, string> = {
  compatible: "Compatible",
  requires_code_review: "Revue de code nécessaire",
  incompatible: "Incompatible",
  unknown: "Inconnue",
};
const PROBE_LABEL: Record<string, string> = {
  none: "Aucun test réel",
  running: "Test réel en cours",
  passed: "Test réel réussi",
  failed: "Test réel échoué",
};

const short = (version: string) => `${version.slice(0, 8)}…${version.slice(-4)}`;
const when = (date: Date | null) => (date ? new Date(date).toLocaleString("fr-FR") : "—");

/**
 * Owner panel “Versions ACE-Step” (skill Replicate-MusikPro-MP3 v1.1.0 §16.3): detect → compare → test → approve
 * → activate → roll back. Detection only reads Replicate metadata; every state change is an explicit owner action.
 */
export default function AdminReplicateVersionsPanel({ overview }: { overview: VersionOverview }) {
  const candidates = overview.versions.filter((row) => row.version !== overview.activeVersion);
  const hasNew = candidates.some((row) => row.activatedAt === null && row.status !== "blocked");
  const healthClass =
    overview.health === "green" ? "is-success" : overview.health === "red" ? "is-danger" : "is-pending";
  const healthLabel =
    overview.health === "green"
      ? "Version active saine"
      : overview.health === "red"
        ? "Échecs depuis l’activation"
        : "À vérifier";

  return (
    <section className="admin-panel admin-editor-card" aria-label="Versions du modèle ACE-Step">
      <div>
        <span className="admin-eyebrow">Modèle fishaudio/ace-step-1.5</span>
        <h2>Versions ACE-Step</h2>
        <p>
          La détection est automatique, l’activation ne l’est jamais : une nouvelle version n’est utilisée qu’après
          vérification, test réel et ton approbation. Le format reste MP3 uniquement.
        </p>
        <span className={`admin-status ${healthClass}`}>{healthLabel}</span>
      </div>

      <dl className="admin-info-grid">
        <div>
          <dt>Version active</dt>
          <dd>
            <input readOnly value={overview.activeVersion} aria-label="Version active (identifiant complet)" />
          </dd>
        </div>
        <div>
          <dt>Active depuis</dt>
          <dd>{overview.activeSince ? when(overview.activeSince) : "Version d’origine"}</dd>
        </div>
        <div>
          <dt>Dernier contrôle</dt>
          <dd>{when(overview.lastCheckedAt)}</dd>
        </div>
        <div>
          <dt>Nouvelle version</dt>
          <dd>{hasNew ? "Oui — à examiner" : "Aucune"}</dd>
        </div>
      </dl>

      <div className="admin-editor-actions">
        <AdminActionForm action={checkReplicateVersions}>
          <button type="submit" disabled={!overview.configured}>
            <Icon i="refresh-cw" size={17} />
            Vérifier les mises à jour
          </button>
        </AdminActionForm>
        {overview.rollbackTarget ? (
          <AdminActionForm action={rollbackReplicateVersion}>
            <input type="hidden" name="expectedActive" value={overview.activeVersion} />
            <label className="admin-check-control">
              <input type="checkbox" required />
              <span>Confirmer le retour à {short(overview.rollbackTarget)}</span>
            </label>
            <button type="submit" className="is-danger">
              <Icon i="undo-2" size={17} />
              Retour arrière
            </button>
          </AdminActionForm>
        ) : null}
      </div>
      <small>
        Aucune génération payante n’est lancée par la vérification. Le coût d’un test réel n’est pas estimé (facturé au
        temps GPU par Replicate : replicate.com/account/billing).
      </small>

      {candidates.length === 0 ? (
        <div className="admin-empty-state" role="status">
          <Icon i="inbox" size={20} />
          <strong>Aucune autre version connue</strong>
          <span>Lance « Vérifier les mises à jour » pour interroger Replicate.</span>
        </div>
      ) : (
        candidates.map((row) => {
          const blockedForCode = row.compatibility !== "compatible";
          return (
            <article key={row.version} className="admin-panel">
              <h3>{short(row.version)}</h3>
              <dl className="admin-info-grid">
                <div>
                  <dt>Statut</dt>
                  <dd>{STATUS_LABEL[row.status] ?? row.status}</dd>
                </div>
                <div>
                  <dt>Compatibilité</dt>
                  <dd>{COMPAT_LABEL[row.compatibility] ?? row.compatibility}</dd>
                </div>
                <div>
                  <dt>MP3</dt>
                  <dd>
                    <span className={`admin-status ${row.mp3Validated ? "is-success" : "is-danger"}`}>
                      {row.mp3Validated ? "MP3 validé" : "MP3 non validé"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Test réel</dt>
                  <dd>
                    {PROBE_LABEL[row.probeStatus] ?? row.probeStatus}
                    {row.probeError ? ` (${row.probeError})` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Détectée</dt>
                  <dd>{when(row.detectedAt)}</dd>
                </div>
                <div>
                  <dt>Publiée par Replicate</dt>
                  <dd>{when(row.sourceCreatedAt)}</dd>
                </div>
              </dl>
              <input readOnly value={row.version} aria-label="Identifiant complet de la version" />

              {row.blockers.length ? (
                <div className="admin-source-notice" role="status">
                  <Icon i="wrench" size={18} />
                  <div>
                    <strong>Activation bloquée : le code doit être revu</strong>
                    <ul>
                      {row.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              {row.diff &&
              (row.diff.addedFields.length ||
                row.diff.removedFields.length ||
                row.diff.newRequiredFields.length ||
                row.diff.changedFields.length ||
                row.diff.outputChanged) ? (
                <details>
                  <summary>Différences avec la version active</summary>
                  <ul>
                    {row.diff.addedFields.map((field) => (
                      <li key={`a-${field}`}>Ajouté : {field}</li>
                    ))}
                    {row.diff.removedFields.map((field) => (
                      <li key={`r-${field}`}>Supprimé : {field}</li>
                    ))}
                    {row.diff.newRequiredFields.map((field) => (
                      <li key={`q-${field}`}>Nouveau champ obligatoire : {field}</li>
                    ))}
                    {row.diff.changedFields.map((change) => (
                      <li key={`c-${change.field}`}>
                        {change.field} — {change.changes.join(" ; ")}
                      </li>
                    ))}
                    {row.diff.outputChanged ? <li>Le schéma de sortie a changé.</li> : null}
                  </ul>
                </details>
              ) : null}

              {row.activatedAt ? null : (
                <div className="admin-editor-actions">
                  <AdminActionForm action={validateReplicateVersion}>
                    <input type="hidden" name="version" value={row.version} />
                    <label className="admin-check-control">
                      <input type="checkbox" name="runPaidProbe" />
                      <span>J’autorise un test réel payant (1 génération MP3 de 30 s)</span>
                    </label>
                    <button type="submit" disabled={blockedForCode || !overview.configured}>
                      <Icon i="activity" size={17} />
                      Tester la version
                    </button>
                  </AdminActionForm>
                  {row.probeStatus === "running" ? (
                    <AdminActionForm action={finishReplicateProbe}>
                      <input type="hidden" name="version" value={row.version} />
                      <button type="submit">
                        <Icon i="refresh-cw" size={17} />
                        Lire le résultat du test
                      </button>
                    </AdminActionForm>
                  ) : null}
                  {row.status !== "approved" ? (
                    <AdminActionForm action={approveReplicateVersion}>
                      <input type="hidden" name="version" value={row.version} />
                      <button type="submit" disabled={blockedForCode || row.probeStatus !== "passed"}>
                        <Icon i="shield-check" size={17} />
                        Approuver
                      </button>
                    </AdminActionForm>
                  ) : (
                    <AdminActionForm action={activateReplicateVersion}>
                      <input type="hidden" name="version" value={row.version} />
                      <input type="hidden" name="expectedActive" value={overview.activeVersion} />
                      <label className="admin-check-control">
                        <input type="checkbox" required />
                        <span>Confirmer l’activation pour toutes les nouvelles générations</span>
                      </label>
                      <button type="submit">
                        <Icon i="rocket" size={17} />
                        Activer
                      </button>
                    </AdminActionForm>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
