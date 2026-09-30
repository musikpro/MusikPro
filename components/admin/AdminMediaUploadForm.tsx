"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import { MAX_MEDIA_UPLOAD_FILES } from "@/lib/media/constants";
import { isAcceptedImage, prepareImageForUpload } from "@/lib/media/prepare-upload";

type UploadResult = { ok: boolean; message?: string };
type ItemStatus = "queued" | "preparing" | "uploading" | "done" | "error";
type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  percent: number;
  message?: string;
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  queued: "En attente",
  preparing: "Conversion AVIF…",
  uploading: "Envoi…",
  done: "Ajoutée",
  error: "Échec",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

/**
 * Uploads one file to /api/admin/media/upload via XMLHttpRequest instead of fetch/a Server
 * Action: only xhr.upload.onprogress exposes real byte-level upload progress in the browser, and
 * a real HTTP endpoint (vs. a Server Action's internal RPC) is what makes that possible.
 */
function uploadWithProgress(file: File, onProgress: (percent: number) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ ok: true });
        return;
      }
      let message: string | undefined;
      try {
        message = (JSON.parse(xhr.responseText) as { error?: string })?.error;
      } catch {
        // réponse non-JSON (ex. erreur proxy) — on garde le message générique côté appelant
      }
      resolve({ ok: false, message });
    };
    xhr.onerror = () => resolve({ ok: false });
    const formData = new FormData();
    formData.set("file", file);
    xhr.send(formData);
  });
}

/**
 * Glisser-déposer (ou clic) → file d'attente → pour chaque image : conversion/compression AVIF dans
 * le navigateur (lib/media/prepare-upload.ts), puis envoi un fichier à la fois (les requêtes Vercel
 * sont limitées à 4,5 Mo, impossible d'envoyer un lot en une fois). Le serveur convertit et garantit
 * l'AVIF sous 2 Mo dans tous les cas (lib/storage/cloudinary.ts). C'est ce composant, et non
 * AdminActionForm, qui pilote les envois : une file d'appels avec progression par octet, rendue via
 * le même toast global que le reste du tableau de bord propriétaire.
 */
export default function AdminMediaUploadForm({ disabled = false }: { disabled?: boolean }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const itemsRef = useRef<QueueItem[]>([]);
  const showToast = useAdminToast();
  const router = useRouter();

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  // Libère les aperçus (object URLs) au démontage.
  useEffect(
    () => () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addFiles = (incoming: File[]) => {
    if (disabled || busy || !incoming.length) return;
    const images = incoming.filter(isAcceptedImage);
    const rejected = incoming.length - images.length;
    if (rejected > 0) {
      showToast({
        message: `${rejected} fichier${rejected > 1 ? "s ignorés" : " ignoré"} : seules les images JPEG, PNG, WebP, AVIF ou GIF sont acceptées.`,
        tone: "info",
      });
    }
    setItems((current) => {
      const known = new Set(current.map((item) => fileKey(item.file)));
      const fresh = images.filter((file) => !known.has(fileKey(file)));
      const room = MAX_MEDIA_UPLOAD_FILES - current.length;
      if (fresh.length > room) {
        showToast({ message: `Maximum ${MAX_MEDIA_UPLOAD_FILES} images à la fois.`, tone: "error" });
      }
      const accepted = fresh.slice(0, Math.max(0, room)).map<QueueItem>((file) => ({
        id: `${fileKey(file)}:${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        percent: 0,
      }));
      return [...current, ...accepted];
    });
  };

  const removeItem = (id: string) => {
    if (busy) return;
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = ""; // permet de re-choisir le même fichier après l'avoir retiré
  };

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!disabled && !busy) setDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const startUpload = async () => {
    const queue = items.filter((item) => item.status === "queued" || item.status === "error");
    if (!queue.length || busy || disabled) return;
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const item of queue) {
      update(item.id, { status: "preparing", percent: 0, message: undefined });
      const prepared = await prepareImageForUpload(item.file);
      update(item.id, { status: "uploading", percent: 0 });
      const result = await uploadWithProgress(prepared, (percent) => update(item.id, { percent }));
      if (result.ok) {
        ok += 1;
        update(item.id, { status: "done", percent: 100 });
      } else {
        failed += 1;
        update(item.id, { status: "error", message: result.message ?? "L'envoi a échoué." });
      }
    }
    setBusy(false);
    // Les images ajoutées quittent la file ; les échecs restent pour pouvoir réessayer.
    setItems((current) => {
      for (const item of current) if (item.status === "done") URL.revokeObjectURL(item.previewUrl);
      return current.filter((item) => item.status !== "done");
    });
    if (failed === 0) {
      showToast({
        message: `${ok} image${ok > 1 ? "s ajoutées" : " ajoutée"} à la médiathèque (AVIF).`,
        tone: "success",
      });
    } else if (ok > 0) {
      showToast({
        message: `${ok} image${ok > 1 ? "s ajoutées" : " ajoutée"}, ${failed} échec${failed > 1 ? "s" : ""}.`,
        tone: "info",
      });
    } else {
      showToast({ message: `Impossible d'ajouter ${failed > 1 ? "ces images" : "cette image"}.`, tone: "error" });
    }
    router.refresh();
  };

  const pendingCount = items.filter((item) => item.status === "queued" || item.status === "error").length;
  const overallPercent = busy
    ? Math.round(
        items.reduce(
          (sum, item) => sum + (item.status === "done" ? 100 : item.status === "uploading" ? item.percent : 0),
          0,
        ) / Math.max(1, items.length),
      )
    : 0;

  return (
    <div className="admin-media-upload-form">
      <label
        htmlFor="media-upload-file"
        className={`admin-media-dropzone${dragging ? " is-dragging" : ""}${disabled || busy ? " is-disabled" : ""}`}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="admin-media-dropzone-icon" aria-hidden="true">
          <Icon i="upload" size={22} />
        </span>
        <strong>{dragging ? "Dépose tes images ici" : "Glisse-dépose tes images ici"}</strong>
        <span>
          ou <u>parcourir</u> — jusqu’à {MAX_MEDIA_UPLOAD_FILES} images (JPEG, PNG, WebP, AVIF ou GIF)
        </span>
        <small>Converties automatiquement en AVIF et compressées sous 2 Mo.</small>
        <input
          id="media-upload-file"
          className="admin-media-dropzone-input"
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || busy}
          onChange={onInputChange}
        />
      </label>

      {items.length ? (
        <ul className="admin-media-queue" aria-label="Images à envoyer">
          {items.map((item) => (
            <li key={item.id} className={`admin-media-queue-item is-${item.status}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="admin-media-queue-thumb" />
              <div className="admin-media-queue-meta">
                <strong title={item.file.name}>{item.file.name}</strong>
                <small>
                  {formatBytes(item.file.size)} · {item.message ?? STATUS_LABEL[item.status]}
                  {item.status === "uploading" ? ` ${item.percent}%` : ""}
                </small>
                {item.status === "uploading" || item.status === "preparing" ? (
                  <div className="admin-progress-track" aria-hidden="true">
                    <span style={{ width: `${item.status === "uploading" ? item.percent : 8}%` }} />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="admin-media-queue-remove"
                aria-label={`Retirer ${item.file.name}`}
                disabled={busy}
                onClick={() => removeItem(item.id)}
              >
                <Icon i="x" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="admin-media-upload-actions">
        <button
          type="button"
          className="admin-primary-action"
          disabled={disabled || busy || pendingCount === 0}
          onClick={() => void startUpload()}
        >
          <Icon i="upload" size={17} />{" "}
          {busy
            ? `Envoi en cours (${overallPercent}%)…`
            : pendingCount
              ? `Ajouter ${pendingCount} image${pendingCount > 1 ? "s" : ""}`
              : "Ajouter"}
        </button>
        {items.length && !busy ? (
          <button
            type="button"
            className="admin-secondary-action"
            onClick={() => {
              for (const item of items) URL.revokeObjectURL(item.previewUrl);
              setItems([]);
            }}
          >
            Vider la liste
          </button>
        ) : null}
      </div>
    </div>
  );
}
