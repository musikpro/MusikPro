"use client";

import {
  deleteTrackingTagAction,
  reorderTrackingTagsAction,
  saveTrackingTagAction,
} from "@/app/admin/tracking-tags/actions";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminConfirmSubmit from "@/components/admin/AdminConfirmSubmit";
import AdminSortableGrid from "@/components/admin/AdminSortableGrid";
import TrackingTagFields, {
  TRACKING_PLACEMENT_LABELS,
  type TrackingTagView,
} from "@/components/admin/TrackingTagFields";
import Icon from "@/components/banani/Icon";

/**
 * Balises de suivi : une carte pleine largeur par balise, repliée par défaut (on la déplie pour voir et modifier son
 * code), réordonnable par glisser-déposer. Réutilise le composant commun AdminSortableGrid (poignée, aperçu, flèches du
 * clavier, enregistrement de l'ordre) ; l'ordre est aussi celui d'insertion dans l'en-tête du site.
 */
export default function AdminTrackingTagSortableList({ tags }: { tags: TrackingTagView[] }) {
  return (
    <AdminSortableGrid
      items={tags}
      onReorder={reorderTrackingTagsAction}
      className="admin-tracking-sortable"
      contain
      hint="Saisis une balise par sa poignée pour changer l’ordre."
      itemLabel={(tag) => tag.name}
      renderPreview={(tag) => (
        <>
          <span className="admin-catalog-icon">
            <Icon i="code" size={18} />
          </span>
          <strong>{tag.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
      renderItem={(tag, context) => (
        <details
          className={`admin-panel admin-tracking-card ${tag.enabled ? "" : "is-hidden"} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <summary className="admin-tracking-summary">
            <span className="admin-catalog-icon">
              <Icon i="code" size={20} />
            </span>
            <span className="admin-tracking-title">
              <strong>{tag.name}</strong>
              <small>{TRACKING_PLACEMENT_LABELS[tag.placement]}</small>
            </span>
            <span className={`admin-status ${tag.enabled ? "is-success" : "is-danger"}`}>
              {tag.enabled ? "Active" : "Désactivée"}
            </span>
            <Icon i="chevron-down" size={18} className="admin-tracking-chevron" />
          </summary>
          <div className="admin-tracking-body">
            <AdminActionForm action={saveTrackingTagAction} id={`tag-${tag.id}`}>
              <TrackingTagFields idPrefix={`tag-${tag.id}`} tag={tag} />
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
          </div>
        </details>
      )}
    />
  );
}
