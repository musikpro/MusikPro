import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import {
  TRASH_RETENTION_DEFAULT_DAYS,
  TRASH_RETENTION_MAX_DAYS,
  TRASH_RETENTION_MIN_DAYS,
} from "@/lib/trash/retention";
import { setTrashRetention } from "./actions";

export default function TrashRetentionPanel({
  songsRetentionDays,
  usersRetentionDays,
}: {
  songsRetentionDays: number;
  usersRetentionDays: number;
}) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="trash" size={20} />
        </span>
        <div>
          <h2>Corbeille</h2>
          <p>
            Une chanson ou un compte supprimé depuis le tableau de bord propriétaire va dans la Corbeille : tu peux le
            restaurer. Passé le délai ci-dessous, il est supprimé définitivement et automatiquement. Par défaut{" "}
            {TRASH_RETENTION_DEFAULT_DAYS} jours pour chacun ; entre {TRASH_RETENTION_MIN_DAYS} et{" "}
            {TRASH_RETENTION_MAX_DAYS} jours.
          </p>
        </div>
        <span className="admin-status is-success">
          {songsRetentionDays} j / {usersRetentionDays} j
        </span>
      </div>
      <AdminActionForm
        action={setTrashRetention}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-editor-field">
          <span>Délai avant suppression automatique des chansons (jours)</span>
          <input
            type="number"
            name="songsRetentionDays"
            inputMode="numeric"
            min={TRASH_RETENTION_MIN_DAYS}
            max={TRASH_RETENTION_MAX_DAYS}
            step={1}
            defaultValue={songsRetentionDays}
            required
          />
        </label>
        <label className="admin-editor-field">
          <span>Délai avant suppression automatique des comptes utilisateurs (jours)</span>
          <input
            type="number"
            name="usersRetentionDays"
            inputMode="numeric"
            min={TRASH_RETENTION_MIN_DAYS}
            max={TRASH_RETENTION_MAX_DAYS}
            step={1}
            defaultValue={usersRetentionDays}
            required
          />
        </label>
        <div className="admin-btn-row">
          <AdminButton type="submit" variant="primary">
            <Icon i="save" size={15} />
            Enregistrer
          </AdminButton>
        </div>
      </AdminActionForm>
    </section>
  );
}
