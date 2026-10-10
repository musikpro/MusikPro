import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import {
  GENERATIONS_PER_PAGE_DEFAULT,
  GENERATIONS_PER_PAGE_MAX,
  GENERATIONS_PER_PAGE_MIN,
  USERS_PER_PAGE_MAX,
  USERS_PER_PAGE_MIN,
} from "@/lib/settings/admin-display-constants";
import { setDisplayPageSizes } from "./actions";

export default function DisplayPageSizesPanel({
  generationsPerPage,
  usersPerPage,
}: {
  generationsPerPage: number;
  usersPerPage: number;
}) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="list" size={20} />
        </span>
        <div>
          <h2>Éléments par page</h2>
          <p>
            Nombre d’éléments affichés sur chaque page des listes « Générations » (chansons) et « Utilisateurs »
            (comptes) du tableau de bord propriétaire. Par défaut {GENERATIONS_PER_PAGE_DEFAULT} pour chacune ; entre{" "}
            {GENERATIONS_PER_PAGE_MIN} et {GENERATIONS_PER_PAGE_MAX}.
          </p>
        </div>
        <span className="admin-status is-success">
          {generationsPerPage} / {usersPerPage}
        </span>
      </div>
      <AdminActionForm
        action={setDisplayPageSizes}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-editor-field">
          <span>Chansons par page (Générations)</span>
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
        <label className="admin-editor-field">
          <span>Comptes par page (Utilisateurs)</span>
          <input
            type="number"
            name="usersPerPage"
            inputMode="numeric"
            min={USERS_PER_PAGE_MIN}
            max={USERS_PER_PAGE_MAX}
            step={1}
            defaultValue={usersPerPage}
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
