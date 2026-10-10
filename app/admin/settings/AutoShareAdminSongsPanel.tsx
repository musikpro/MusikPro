import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import { setAutoShareAdminSongs } from "./actions";

export default function AutoShareAdminSongsPanel({ enabled }: { enabled: boolean }) {
  return (
    <section className={`admin-panel admin-bypass-panel ${enabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="library" size={20} />
        </span>
        <div>
          <h2>Chansons des administrateurs dans Découvrir</h2>
          <p>
            Quand ce réglage est actif, chaque chanson générée par un compte administrateur (propriétaire du SaaS) est
            ajoutée automatiquement à la page Découvrir des clients. Tu peux ensuite la retirer, ou la remettre, chanson
            par chanson depuis le menu « Détails » de la page Générations. Désactivé, ces chansons n’y vont plus
            d’elles-mêmes ; celles déjà ajoutées y restent.
          </p>
        </div>
        <span className={`admin-status ${enabled ? "is-success" : "is-pending"}`}>
          {enabled ? "Activé" : "Désactivé"}
        </span>
      </div>
      <AdminActionForm
        action={setAutoShareAdminSongs}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-check-control">
          <input type="checkbox" name="enabled" value="true" defaultChecked={enabled} />
          <span>Ajouter automatiquement les chansons des administrateurs à Découvrir</span>
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
