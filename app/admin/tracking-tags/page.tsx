import { redirect } from "next/navigation";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminConfirmSubmit from "@/components/admin/AdminConfirmSubmit";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { listTrackingTags } from "@/lib/tracking-tags/server";
import { TRACKING_CODE_MAX } from "@/lib/tracking-tags/parse";
import { TRACKING_NAME_MAX, type TrackingPlacement } from "@/lib/validation/tracking-tags";
import { deleteTrackingTagAction, saveTrackingTagAction } from "./actions";

export const dynamic = "force-dynamic";

const PLACEMENT_LABELS: Record<TrackingPlacement, string> = {
  landing: "Landing page seulement",
  dashboard: "Tableau de bord client seulement",
  both: "Landing page + tableau de bord client",
};

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--admin-border)",
  borderRadius: 12,
} as const;

function TagFields({
  idPrefix,
  tag,
}: {
  idPrefix: string;
  tag?: Awaited<ReturnType<typeof listTrackingTags>>[number];
}) {
  return (
    <>
      {tag ? <input type="hidden" name="id" value={tag.id} /> : null}
      <label className="admin-field-label" htmlFor={`${idPrefix}-name`}>
        Nom de la balise
      </label>
      <input
        id={`${idPrefix}-name`}
        name="name"
        required
        maxLength={TRACKING_NAME_MAX}
        defaultValue={tag?.name ?? ""}
        placeholder="Ex. : Facebook code"
        style={fieldStyle}
      />
      <label className="admin-field-label" htmlFor={`${idPrefix}-code`} style={{ marginTop: 12 }}>
        Code de la balise
      </label>
      <textarea
        id={`${idPrefix}-code`}
        name="code"
        required
        rows={5}
        maxLength={TRACKING_CODE_MAX}
        defaultValue={tag?.code ?? ""}
        placeholder={'<meta name="facebook-domain-verification" content="..." />'}
        spellCheck={false}
        style={{ ...fieldStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
      />
      <label className="admin-field-label" htmlFor={`${idPrefix}-placement`} style={{ marginTop: 12 }}>
        Où mesurer l’audience ?
      </label>
      <select
        id={`${idPrefix}-placement`}
        name="placement"
        defaultValue={tag?.placement ?? "landing"}
        style={fieldStyle}
      >
        {(Object.keys(PLACEMENT_LABELS) as TrackingPlacement[]).map((value) => (
          <option key={value} value={value}>
            {PLACEMENT_LABELS[value]}
          </option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <input type="checkbox" name="enabled" defaultChecked={tag ? tag.enabled : true} />
        Balise active
      </label>
    </>
  );
}

/**
 * Balises de suivi et de publicité (Facebook, Google, TikTok…) : un nom, un code, et l’endroit où elles s’insèrent
 * dans l’en-tête (landing page, tableau de bord client, ou les deux). Réservé au Super Admin.
 */
export default async function AdminTrackingTagsPage() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin");
  const tags = await listTrackingTags();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Balises de suivi"
        description="Ajoute les balises des réseaux sociaux et de la publicité (vérification de domaine, pixels, tags) : elles sont insérées dans l’en-tête de la landing page et/ou du tableau de bord client."
      />
      <AdminTabs
        ariaLabel="Balises de suivi"
        tabs={[
          { id: "list", label: `Mes balises (${tags.length})` },
          { id: "add", label: "Ajouter une balise" },
        ]}
      >
        <AdminTabPanel id="list">
          {tags.length === 0 ? (
            <section className="admin-panel">
              <p>Aucune balise pour le moment. Utilise l’onglet « Ajouter une balise ».</p>
            </section>
          ) : (
            tags.map((tag) => (
              <section key={tag.id} className="admin-panel">
                <div className="admin-provider-heading">
                  <span className="admin-catalog-icon">
                    <Icon i="code" size={20} />
                  </span>
                  <div>
                    <h2>{tag.name}</h2>
                    <p>{PLACEMENT_LABELS[tag.placement]}</p>
                  </div>
                  <span className={`admin-status ${tag.enabled ? "is-success" : "is-danger"}`}>
                    {tag.enabled ? "Active" : "Désactivée"}
                  </span>
                </div>
                <AdminActionForm action={saveTrackingTagAction} id={`tag-${tag.id}`}>
                  <TagFields idPrefix={`tag-${tag.id}`} tag={tag} />
                </AdminActionForm>
                <AdminActionForm action={deleteTrackingTagAction} id={`del-${tag.id}`}>
                  <input type="hidden" name="id" value={tag.id} />
                </AdminActionForm>
                <div className="admin-btn-row">
                  <button type="submit" form={`tag-${tag.id}`} className="admin-btn admin-btn-primary">
                    <Icon i="save" size={15} />
                    Enregistrer
                  </button>
                  <AdminConfirmSubmit
                    form={`del-${tag.id}`}
                    variant="danger"
                    confirmMessage={`Supprimer la balise « ${tag.name} » ? Elle disparaîtra de l’en-tête du site.`}
                  >
                    <Icon i="trash-2" size={15} />
                    Supprimer
                  </AdminConfirmSubmit>
                </div>
              </section>
            ))
          )}
        </AdminTabPanel>
        <AdminTabPanel id="add">
          <section className="admin-panel">
            <AdminActionForm action={saveTrackingTagAction}>
              <TagFields idPrefix="new-tag" />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--admin-muted)" }}>
                Formats acceptés : <code>meta</code>, <code>link</code>, <code>script</code> et <code>noscript</code>{" "}
                avec un pixel. Les scripts externes ne se chargent que depuis les domaines autorisés (Facebook, Google,
                TikTok, LinkedIn, X, Hotjar, Clarity). Les scripts sont chargés après l’affichage de la page pour ne pas
                la ralentir.
              </p>
              <div className="admin-btn-row">
                <button type="submit" className="admin-btn admin-btn-primary">
                  <Icon i="plus" size={15} />
                  Ajouter la balise
                </button>
              </div>
            </AdminActionForm>
          </section>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
