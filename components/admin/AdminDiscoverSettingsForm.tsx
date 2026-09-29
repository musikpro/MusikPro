"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { DISCOVER_MAX_ITEMS_MAX, DISCOVER_MAX_ITEMS_MIN, type DiscoverSettingsValue } from "@/lib/discover/types";

/** The three simple controls of the client "Découvrir" page — see /admin/library. */
export default function AdminDiscoverSettingsForm({
  action,
  settings,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  settings: DiscoverSettingsValue;
}) {
  return (
    <AdminActionForm action={action} className="admin-editor-grid">
      <div className="admin-editor-field">
        <span>Page Découvrir</span>
        <AdminSelect
          name="enabled"
          ariaLabel="Affichage de la page Découvrir"
          defaultValue={String(settings.enabled)}
          options={[
            { value: "true", label: "Active — les chansons des clients y apparaissent" },
            { value: "false", label: "Masquée — la page ne montre aucune chanson" },
          ]}
        />
        <small>Chaque chanson terminée est ajoutée automatiquement. Son créateur peut la retirer depuis Découvrir.</small>
      </div>
      <div className="admin-editor-field">
        <span>Ordre d’affichage</span>
        <AdminSelect
          name="sortBy"
          ariaLabel="Ordre d’affichage des chansons"
          defaultValue={settings.sortBy}
          options={[
            { value: "recent", label: "Les plus récentes d’abord" },
            { value: "popular", label: "Les plus écoutées d’abord" },
          ]}
        />
      </div>
      <label className="admin-editor-field">
        <span>Nombre maximum de chansons affichées</span>
        <input
          name="maxItems"
          type="number"
          required
          min={DISCOVER_MAX_ITEMS_MIN}
          max={DISCOVER_MAX_ITEMS_MAX}
          defaultValue={settings.maxItems}
        />
        <small>
          Entre {DISCOVER_MAX_ITEMS_MIN} et {DISCOVER_MAX_ITEMS_MAX}.
        </small>
      </label>
      <div className="admin-editor-actions is-wide">
        <button type="submit">
          <Icon i="save" size={17} /> Enregistrer les réglages
        </button>
      </div>
    </AdminActionForm>
  );
}
