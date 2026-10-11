import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import {
  VISIBLE_MUSIC_STYLES_DEFAULT,
  VISIBLE_MUSIC_STYLES_MAX,
  VISIBLE_MUSIC_STYLES_MIN,
} from "@/lib/music-styles/visible";
import { setVisibleMusicStyles } from "./actions";

export default function VisibleMusicStylesPanel({ visibleMusicStyles }: { visibleMusicStyles: number }) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="layout-grid" size={20} />
        </span>
        <div>
          <h2>Styles musicaux visibles</h2>
          <p>
            Nombre de styles musicaux montrés d’emblée à l’étape « Choisis le style et l’ambiance » du parcours de
            création. Les autres se déroulent d’un clic sur la barre « Voir plus de styles musicaux », pour que le
            client ne se perde pas. Par défaut {VISIBLE_MUSIC_STYLES_DEFAULT} ; entre {VISIBLE_MUSIC_STYLES_MIN} et{" "}
            {VISIBLE_MUSIC_STYLES_MAX}.
          </p>
        </div>
        <span className="admin-status is-success">{visibleMusicStyles}</span>
      </div>
      <AdminActionForm
        action={setVisibleMusicStyles}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-editor-field">
          <span>Styles visibles avant « Voir plus »</span>
          <input
            type="number"
            name="visibleMusicStyles"
            inputMode="numeric"
            min={VISIBLE_MUSIC_STYLES_MIN}
            max={VISIBLE_MUSIC_STYLES_MAX}
            step={1}
            defaultValue={visibleMusicStyles}
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
