import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import { setExclusivePlayback } from "./actions";

export default function PlaybackPanel({ exclusivePlaybackEnabled }: { exclusivePlaybackEnabled: boolean }) {
  return (
    <section className={`admin-panel admin-bypass-panel ${exclusivePlaybackEnabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="music-2" size={20} />
        </span>
        <div>
          <h2>Lecture des chansons</h2>
          <p>
            Quand ce réglage est actif, lancer une chanson met automatiquement en pause toutes les autres sur la même
            page : accueil public, tableau de bord client, bibliothèque, page de partage et aperçus du tableau de bord
            propriétaire. La musique d’ambiance du tableau de bord client n’est pas concernée : elle baisse déjà
            d’elle-même pendant qu’une chanson joue. Désactivé, plusieurs chansons peuvent jouer en même temps.
          </p>
        </div>
        <span className={`admin-status ${exclusivePlaybackEnabled ? "is-success" : "is-pending"}`}>
          {exclusivePlaybackEnabled ? "Activée" : "Désactivée"}
        </span>
      </div>
      <AdminActionForm
        action={setExclusivePlayback}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-check-control">
          <input
            type="checkbox"
            name="exclusivePlaybackEnabled"
            value="true"
            defaultChecked={exclusivePlaybackEnabled}
          />
          <span>Interdire la lecture de deux chansons en même temps</span>
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
