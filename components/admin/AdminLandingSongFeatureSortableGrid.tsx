"use client";
import Link from "next/link";
import { useActionState } from "react";
import { deleteLandingSongFeature, reorderLandingLibraryFeatures, reorderLandingShowcaseFeatures } from "@/app/admin/landing-features/actions";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import AdminDeleteLandingSongFeatureButton from "./AdminDeleteLandingSongFeatureButton";
import AdminSortableGrid from "./AdminSortableGrid";
import type { LandingSongFeatureRow, LandingSongFeatureSection } from "@/lib/landing-features/admin";

function DeleteLandingSongFeatureForm({ id, label }: { id: string; label: string }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(deleteLandingSongFeature, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteLandingSongFeatureButton label={label} pending={pending} />
    </form>
  );
}

export default function AdminLandingSongFeatureSortableGrid({
  section,
  rows,
}: {
  section: LandingSongFeatureSection;
  rows: LandingSongFeatureRow[];
}) {
  return (
    <AdminSortableGrid
      items={rows}
      onReorder={section === "showcase" ? reorderLandingShowcaseFeatures : reorderLandingLibraryFeatures}
      className="admin-music-style-grid admin-occasion-grid"
      itemLabel={(row) => row.songTitle}
      renderItem={(row, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-occasion-card ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            {row.coverUrlOverride ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.coverUrlOverride} alt="" className="admin-landing-feature-thumb" />
            ) : (
              <span className="admin-catalog-icon" aria-hidden="true">
                <Icon i="music-2" size={18} />
              </span>
            )}
            <span className="admin-status is-success">Position {context.index + 1}</span>
          </div>
          <h2>{row.songTitle}</h2>
          <small>
            <Link href={`/s/${row.songSlug}`} target="_blank" rel="noopener noreferrer">
              Voir la page publique
            </Link>
          </small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/landing-features/${row.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <DeleteLandingSongFeatureForm id={row.id} label={row.songTitle} />
          </footer>
        </article>
      )}
      renderPreview={(row) => (
        <>
          <span className="admin-catalog-icon">
            <Icon i="music-2" size={18} />
          </span>
          <strong>{row.songTitle}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
