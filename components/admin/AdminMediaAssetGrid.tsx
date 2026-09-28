"use client";
import { useActionState } from "react";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import AdminDeleteMediaAssetButton from "./AdminDeleteMediaAssetButton";
import { deleteMediaAsset } from "@/app/admin/media/actions";
import type { MediaAsset } from "@/lib/media/admin";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function DeleteMediaAssetForm({ publicId }: { publicId: string }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(deleteMediaAsset, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="publicId" value={publicId} />
      <AdminDeleteMediaAssetButton pending={pending} />
    </form>
  );
}

function CopyUrlButton({ url }: { url: string }) {
  const showToast = useAdminToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: "Lien de l'image copié.", tone: "success" });
    } catch {
      showToast({ message: "Impossible de copier le lien.", tone: "error" });
    }
  };
  return (
    <button type="button" className="admin-secondary-action" onClick={() => void copy()}>
      <Icon i="copy" size={15} /> Copier le lien
    </button>
  );
}

export default function AdminMediaAssetGrid({ assets }: { assets: MediaAsset[] }) {
  return (
    <div className="admin-catalog-grid admin-media-grid">
      {assets.map((asset) => (
        <article key={asset.publicId} className="admin-catalog-card admin-media-card">
          <div className="admin-catalog-card-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt="" className="admin-media-thumb" />
          </div>
          <small>
            {formatBytes(asset.bytes)}
            {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          </small>
          <footer className="admin-style-actions">
            <CopyUrlButton url={asset.url} />
            <DeleteMediaAssetForm publicId={asset.publicId} />
          </footer>
        </article>
      ))}
    </div>
  );
}
