import { redirect } from "next/navigation";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminTrackingTagSortableList from "@/components/admin/AdminTrackingTagSortableList";
import TrackingTagFields from "@/components/admin/TrackingTagFields";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import MetaCapiPanel from "@/components/admin/MetaCapiPanel";
import { getMetaCapiStatus } from "@/lib/meta-capi/settings";
import { listTrackingTags } from "@/lib/tracking-tags/server";
import { saveTrackingTagAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Balises de suivi et de publicité (Facebook, Google, TikTok…) : un nom, un code, et l’endroit où elles s’insèrent
 * dans l’en-tête (landing page, tableau de bord client, ou les deux). Réservé au Super Admin.
 */
export default async function AdminTrackingTagsPage() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin");
  const [tags, capiStatus] = await Promise.all([listTrackingTags(), getMetaCapiStatus().catch(() => null)]);

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
          { id: "capi", label: "API Conversions" },
        ]}
      >
        <AdminTabPanel id="list">
          {tags.length === 0 ? (
            <section className="admin-panel">
              <p>Aucune balise pour le moment. Utilise l’onglet « Ajouter une balise ».</p>
            </section>
          ) : (
            <AdminTrackingTagSortableList
              tags={tags.map(({ id, name, code, placement, enabled }) => ({ id, name, code, placement, enabled }))}
            />
          )}
        </AdminTabPanel>
        <AdminTabPanel id="add">
          <section className="admin-panel">
            <AdminActionForm action={saveTrackingTagAction}>
              <TrackingTagFields idPrefix="new-tag" />
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
        <AdminTabPanel id="capi">
          {capiStatus ? (
            <MetaCapiPanel status={capiStatus} />
          ) : (
            <section className="admin-panel">
              <p>L’API Conversions n’est pas encore disponible (migration à appliquer).</p>
            </section>
          )}
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
