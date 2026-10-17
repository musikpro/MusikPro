import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminConfirmSubmit from "@/components/admin/AdminConfirmSubmit";
import Icon from "@/components/banani/Icon";
import {
  removeMetaCapiTokenAction,
  saveMetaCapiAction,
  sendMetaCapiTestEventAction,
  verifyMetaCapiAction,
} from "@/app/admin/tracking-tags/capi-actions";
import type { MetaCapiStatus } from "@/lib/meta-capi/settings";
import { META_TEST_CODE_MAX } from "@/lib/validation/meta-capi";

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--admin-border)",
  borderRadius: 12,
} as const;
const hintStyle = { margin: "6px 0 0", fontSize: 12, color: "var(--admin-muted)" } as const;

/**
 * API Conversions de Meta : le serveur envoie lui aussi chaque page vue (hors administration) à Meta, en plus du pixel
 * du navigateur. Le token est chiffré en base et n'est jamais réaffiché (seulement ses 4 derniers caractères).
 */
export default function MetaCapiPanel({ status }: { status: MetaCapiStatus }) {
  const ready = status.hasToken && Boolean(status.pixelId);
  return (
    <section className="admin-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="server" size={20} />
        </span>
        <div>
          <h2>API Conversions (Meta)</h2>
          <p>
            Envoie les pages vues depuis le serveur, en complément du pixel. S’applique à tout le site sauf
            l’administration (landing, pages publiques, tableau de bord client et mode invité).
          </p>
        </div>
        <span className={`admin-status ${status.enabled && ready ? "is-success" : "is-danger"}`}>
          {status.enabled && ready ? "Active" : "Inactive"}
        </span>
      </div>

      <AdminActionForm action={saveMetaCapiAction} id="capi-save">
        <label className="admin-field-label" htmlFor="capi-pixel">
          ID du pixel (jeu de données)
        </label>
        <input
          id="capi-pixel"
          name="pixelId"
          inputMode="numeric"
          maxLength={20}
          defaultValue={status.pixelId ?? ""}
          placeholder="Ex. : 2385967322143642"
          style={fieldStyle}
        />
        <label className="admin-field-label" htmlFor="capi-token" style={{ marginTop: 12 }}>
          Token d’accès
        </label>
        <input
          id="capi-token"
          name="token"
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          maxLength={512}
          placeholder={
            status.hasToken
              ? `Enregistré (se termine par …${status.tokenLast4 ?? "????"}) — laisse vide pour le garder`
              : "Colle le token généré dans le Gestionnaire d’événements"
          }
          style={fieldStyle}
        />
        <p style={hintStyle}>
          Chiffré avant d’être enregistré, jamais réaffiché, jamais envoyé au navigateur. Gestionnaire d’événements →
          Paramètres → API Conversions → « Générer un token d’accès ».
        </p>
        <label className="admin-field-label" htmlFor="capi-test" style={{ marginTop: 12 }}>
          Code d’événement de test (facultatif)
        </label>
        <input
          id="capi-test"
          name="testEventCode"
          maxLength={META_TEST_CODE_MAX}
          defaultValue={status.testEventCode ?? ""}
          placeholder="Ex. : TEST70629"
          style={fieldStyle}
        />
        <p style={hintStyle}>
          Tant qu’il est renseigné, les événements arrivent dans l’onglet « Tester les événements » de Meta.{" "}
          <strong>Videz ce champ une fois le test terminé</strong> pour que les événements comptent normalement.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <input type="checkbox" name="enabled" defaultChecked={status.enabled} />
          Activer l’API Conversions
        </label>
      </AdminActionForm>

      <AdminActionForm action={verifyMetaCapiAction} id="capi-verify">
        <span hidden />
      </AdminActionForm>
      <AdminActionForm action={sendMetaCapiTestEventAction} id="capi-send-test">
        <span hidden />
      </AdminActionForm>
      <AdminActionForm action={removeMetaCapiTokenAction} id="capi-remove">
        <span hidden />
      </AdminActionForm>

      <div className="admin-btn-row">
        <button type="submit" form="capi-save" className="admin-btn admin-btn-primary">
          <Icon i="save" size={15} />
          Enregistrer
        </button>
        <button type="submit" form="capi-verify" className="admin-btn admin-btn-secondary" disabled={!ready}>
          <Icon i="shield-check" size={15} />
          Vérifier la connexion
        </button>
        <button
          type="submit"
          form="capi-send-test"
          className="admin-btn admin-btn-secondary"
          disabled={!ready || !status.testEventCode}
          title={status.testEventCode ? undefined : "Renseigne et enregistre d’abord le code de test"}
        >
          <Icon i="send" size={15} />
          Envoyer un événement de test
        </button>
        {status.hasToken ? (
          <AdminConfirmSubmit
            form="capi-remove"
            variant="danger"
            confirmMessage="Supprimer le token ? L’API Conversions sera désactivée jusqu’à ce que tu en enregistres un nouveau."
          >
            <Icon i="trash-2" size={15} />
            Supprimer le token
          </AdminConfirmSubmit>
        ) : null}
      </div>
      <p style={hintStyle}>
        Le pixel du navigateur et l’API Conversions envoient chacun la page vue : Meta les rapproche (même nom
        d’événement, cookie _fbp) pour ne pas les compter deux fois. Contrôle-le dans « Vue d’ensemble » du Gestionnaire
        d’événements.
      </p>
    </section>
  );
}
