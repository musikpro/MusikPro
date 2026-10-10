import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import {
  GENERATIONS_PER_PAGE_DEFAULT,
  GENERATIONS_PER_PAGE_MAX,
  GENERATIONS_PER_PAGE_MIN,
} from "@/lib/settings/admin-display-constants";
import { setGenerationsPerPage } from "./actions";

export default function GenerationsPerPagePanel({ generationsPerPage }: { generationsPerPage: number }) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="list" size={20} />
        </span>
        <div>
          <h2>Chansons par page</h2>
          <p>
            Nombre de chansons affichées sur chaque page de la liste « Générations » du tableau de bord propriétaire.
            Par défaut {GENERATIONS_PER_PAGE_DEFAULT} ; entre {GENERATIONS_PER_PAGE_MIN} et {GENERATIONS_PER_PAGE_MAX}.
          </p>
        </div>
        <span className="admin-status is-success">{generationsPerPage} par page</span>
      </div>
      <AdminActionForm
        action={setGenerationsPerPage}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-editor-field">
          <span>Nombre de chansons par page</span>
          <input
            type="number"
            name="generationsPerPage"
            inputMode="numeric"
            min={GENERATIONS_PER_PAGE_MIN}
            max={GENERATIONS_PER_PAGE_MAX}
            step={1}
            defaultValue={generationsPerPage}
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
