"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Icon from "@/components/banani/Icon";
import { apiFetch } from "@/lib/api/client";
import type { MediaAsset } from "@/lib/media/admin";

/**
 * Modal that lists the images of the shared media library (the Médias menu) so an admin form can
 * reuse one instead of uploading again. Single shared picker: any owner form that needs "pick an
 * existing image" opens this, rather than each page building its own file input or gallery.
 */
export default function AdminMediaPickerModal({
  open,
  selectedUrl,
  onSelect,
  onClose,
}: {
  open: boolean;
  selectedUrl?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiFetch<{ assets: MediaAsset[] }>("/api/admin/media", { timeoutMs: 20_000 })
      .then((result) => {
        if (cancelled) return;
        setError("");
        setAssets(result.assets);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger les médias.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="admin-modal admin-media-picker" role="dialog" aria-modal="true" aria-label="Choisir une image">
        <header className="admin-modal-head">
          <div>
            <strong>Choisir une image</strong>
            <small>Images de la médiathèque (menu Médias)</small>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fermer">
            <Icon i="x" size={18} />
          </button>
        </header>
        <div className="admin-modal-body">
          {error ? (
            <p className="admin-field-error">{error}</p>
          ) : assets === null ? (
            <p className="admin-modal-hint">
              <Icon i="loader-circle" size={16} className="animate-spin" /> Chargement des images…
            </p>
          ) : assets.length === 0 ? (
            <div className="admin-modal-hint">
              <p>La médiathèque est vide pour l’instant.</p>
              <Link href="/admin/media" className="admin-secondary-action">
                <Icon i="upload" size={15} /> Importer des images dans Médias
              </Link>
            </div>
          ) : (
            <div className="admin-media-picker-grid">
              {assets.map((asset) => (
                <button
                  key={asset.publicId}
                  type="button"
                  className={`admin-media-picker-item${asset.url === selectedUrl ? " is-selected" : ""}`}
                  onClick={() => onSelect(asset.url)}
                  aria-label="Choisir cette image"
                  aria-pressed={asset.url === selectedUrl}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt="" loading="lazy" />
                  {asset.url === selectedUrl ? (
                    <span className="admin-media-picker-check">
                      <Icon i="check" size={14} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <footer className="admin-modal-foot">
          <Link href="/admin/media" className="admin-modal-link">
            Gérer la médiathèque
          </Link>
          <button type="button" className="admin-secondary-action" onClick={onClose}>
            Annuler
          </button>
        </footer>
      </div>
    </div>,
    // Mounted inside `.admin-app` (not <body>) so the modal inherits the admin theme variables.
    document.querySelector(".admin-app") ?? document.body,
  );
}
