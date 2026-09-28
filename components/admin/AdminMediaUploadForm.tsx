"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import { MAX_MEDIA_UPLOAD_FILES } from "@/lib/media/constants";

type UploadResult = { ok: boolean; message?: string };

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
 * A batch of files can't be sent to a single request (Vercel Functions cap request bodies at
 * 4.5 MB, easily blown past by a handful of raw photos) — so this uploads them one at a time,
 * sequentially, combining each file's own upload-progress fraction with its position in the
 * batch into one running percentage. This is why it drives XMLHttpRequest itself instead of
 * going through AdminActionForm/useActionState (built for one submission at a time, and with no
 * access to upload-progress events either): same underlying toast mechanism, adapted for a queue
 * of calls, mirroring the local-pending carve-out already used by AdminMusicStyleSortableGrid.
 */
export default function AdminMediaUploadForm({ disabled = false }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ index: number; total: number; filePercent: number } | null>(null);
  const showToast = useAdminToast();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return;
    if (files.length > MAX_MEDIA_UPLOAD_FILES) {
      showToast({
        message: `Choisis au maximum ${MAX_MEDIA_UPLOAD_FILES} images à la fois.`,
        tone: "error",
      });
      return;
    }

    startTransition(async () => {
      setProgress({ index: 0, total: files.length, filePercent: 0 });
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        const result = await uploadWithProgress(files[i], (filePercent) =>
          setProgress({ index: i, total: files.length, filePercent }),
        );
        if (result.ok) ok += 1;
        else failed += 1;
      }
      setProgress(null);
      form.reset();
      if (failed === 0) {
        showToast({
          message: `${ok} image${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""} à la médiathèque.`,
          tone: "success",
        });
      } else if (ok > 0) {
        showToast({
          message: `${ok} image${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""}, ${failed} échec${failed > 1 ? "s" : ""}.`,
          tone: "info",
        });
      } else {
        showToast({ message: `Impossible d'ajouter ${failed > 1 ? "ces images" : "cette image"}.`, tone: "error" });
      }
      router.refresh();
    });
  };

  const overallPercent = progress
    ? Math.round(((progress.index + progress.filePercent / 100) / progress.total) * 100)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="admin-media-upload-form">
      <label htmlFor="media-upload-file" className="admin-media-upload-label">
        <Icon i="upload" size={18} />
        <span>
          Choisir jusqu’à {MAX_MEDIA_UPLOAD_FILES} images (JPEG, PNG, WebP, AVIF ou GIF — compressées sous 2 Mo
          automatiquement)
        </span>
      </label>
      <input
        id="media-upload-file"
        type="file"
        name="file"
        accept="image/*"
        multiple
        required
        disabled={disabled || pending}
      />
      <button type="submit" className="admin-primary-action" disabled={disabled || pending}>
        <Icon i="upload" size={17} />{" "}
        {progress ? `Envoi ${progress.index + 1}/${progress.total} (${overallPercent}%)…` : "Ajouter"}
      </button>
      {progress ? (
        <div className="admin-media-upload-progress">
          <div
            className="admin-progress-track"
            aria-label={`Import : ${overallPercent} %, image ${progress.index + 1} sur ${progress.total}`}
          >
            <span style={{ width: `${overallPercent}%` }} />
          </div>
          <small>{overallPercent}%</small>
        </div>
      ) : null}
    </form>
  );
}
