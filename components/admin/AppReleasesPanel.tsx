"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import { registerRelease, removeRelease, setReleasePublication } from "@/app/admin/mobile-apps/releases-actions";
import { ANDROID_BLOB_PREFIX, MAX_APK_BYTES, WARN_APK_BYTES } from "@/lib/app-releases/constants";

export type ReleaseRow = {
  id: string;
  version: string;
  build: number;
  sizeBytes: number;
  sha256: string;
  notes: string | null;
  published: boolean;
  downloads: number;
  createdAt: string;
};

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;

export default function AppReleasesPanel({
  releases,
  storageReady,
  suggestedBuild,
}: {
  releases: ReleaseRow[];
  storageReady: boolean;
  suggestedBuild: number;
}) {
  const showToast = useAdminToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, registerAction] = useActionState<AdminActionState, FormData>(registerRelease, null);
  useAdminActionToast(state);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileInfo, setFileInfo] = useState<{ size: number } | null>(null);
  const published = releases.find((release) => release.published);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      showToast({ message: "Choisis le fichier .apk à envoyer.", tone: "error" });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".apk")) {
      showToast({ message: "Le fichier doit se terminer par .apk.", tone: "error" });
      return;
    }
    if (file.size > MAX_APK_BYTES) {
      showToast({ message: `Fichier trop lourd (${mb(file.size)}) : 35 Mo au maximum.`, tone: "error" });
      return;
    }
    setProgress(0);
    try {
      const blob = await upload(`${ANDROID_BLOB_PREFIX}android.apk`, file, {
        access: "private",
        handleUploadUrl: "/api/admin/app-releases/upload",
        multipart: true,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const payload = new FormData();
      payload.set("pathname", blob.pathname);
      payload.set("version", String(data.get("version") ?? ""));
      payload.set("build", String(data.get("build") ?? ""));
      payload.set("notes", String(data.get("notes") ?? ""));
      startTransition(() => registerAction(payload));
      form.reset();
      setFileInfo(null);
    } catch (error) {
      showToast({
        message: error instanceof Error && error.message ? `Envoi impossible : ${error.message}` : "Envoi impossible.",
        tone: "error",
      });
    } finally {
      setProgress(null);
    }
  }

  return (
    <section className={`admin-panel ${published ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="download" size={20} />
        </span>
        <div>
          <h2>Fichiers d&rsquo;installation Android</h2>
          <p>
            Envoie l&rsquo;APK signé de l&rsquo;application : la page « Télécharger l&rsquo;application » du site
            (ouverte par le logo Google Play) le propose en option, après l&rsquo;installation sans avertissement. Le
            fichier est vérifié par le serveur (APK de MusikPro, signé) et stocké dans un espace privé. Taille maximale
            : 35 Mo.
          </p>
        </div>
        <span className={`admin-status ${published ? "is-success" : "is-pending"}`}>
          {published ? `Publiée : ${published.version}` : "Aucune version publiée"}
        </span>
      </div>

      {!storageReady && (
        <p className="admin-field-hint" role="alert">
          Le stockage privé n&rsquo;est pas encore configuré (variable BLOB_READ_WRITE_TOKEN). Crée un « Blob store »
          privé dans Vercel (Storage) et relie-le au projet, puis redéploie.
        </p>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="admin-stack-form">
        <div className="admin-form-two-cols">
          <label className="admin-editor-field">
            <span>Fichier APK</span>
            <input
              type="file"
              name="file"
              accept=".apk,application/vnd.android.package-archive"
              required
              disabled={!storageReady || progress !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileInfo(file ? { size: file.size } : null);
              }}
            />
          </label>
          <label className="admin-editor-field">
            <span>Version affichée</span>
            <input
              type="text"
              name="version"
              placeholder="1.2"
              inputMode="decimal"
              required
              disabled={progress !== null}
            />
          </label>
          <label className="admin-editor-field">
            <span>Numéro de build (supérieur au précédent)</span>
            <input
              type="number"
              name="build"
              min={1}
              defaultValue={suggestedBuild}
              required
              disabled={progress !== null}
            />
          </label>
          <label className="admin-editor-field">
            <span>Notes de version (facultatif)</span>
            <textarea name="notes" rows={2} maxLength={1000} disabled={progress !== null} />
          </label>
        </div>
        {fileInfo && fileInfo.size > WARN_APK_BYTES && (
          <p className="admin-field-hint" role="status">
            Ce fichier fait {mb(fileInfo.size)} : il devient lourd à télécharger sur mobile (maximum accepté : 35 Mo).
          </p>
        )}
        <p className="admin-field-hint">
          Version et build doivent être ceux de l&rsquo;APK (commande « npm run mobile:version »). Une version envoyée
          n&rsquo;est pas visible tant que tu ne l&rsquo;as pas publiée.
        </p>
        <button
          type="submit"
          className="admin-form-submit"
          style={{ width: "auto", justifySelf: "end", alignSelf: "end" }}
          disabled={!storageReady || progress !== null}
        >
          <Icon i="upload" size={16} />
          {progress === null ? "Envoyer et vérifier" : `Envoi en cours… ${progress} %`}
        </button>
        {progress !== null && (
          <progress value={progress} max={100} aria-label="Progression de l'envoi" style={{ width: "100%" }} />
        )}
      </form>

      <h3 style={{ marginTop: "1.5rem" }}>Versions envoyées</h3>
      {releases.length === 0 ? (
        <p className="admin-field-hint">Aucune version pour l&rsquo;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
          {releases.map((release) => (
            <li key={release.id} className={`admin-panel ${release.published ? "is-active" : ""}`}>
              <div className="admin-provider-heading">
                <div>
                  <h4>
                    Version {release.version} · build {release.build}
                  </h4>
                  <p>
                    {mb(release.sizeBytes)} · {release.downloads} téléchargement{release.downloads > 1 ? "s" : ""} ·
                    envoyée le {new Date(release.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="admin-field-hint" style={{ wordBreak: "break-all" }}>
                    SHA-256 : {release.sha256}
                  </p>
                  {release.notes && <p className="admin-field-hint">{release.notes}</p>}
                </div>
                <span className={`admin-status ${release.published ? "is-success" : "is-pending"}`}>
                  {release.published ? "Publiée" : "Non publiée"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <AdminActionForm action={setReleasePublication}>
                  <input type="hidden" name="id" value={release.id} />
                  <input type="hidden" name="publish" value={release.published ? "0" : "1"} />
                  <button type="submit" className="admin-form-submit">
                    <Icon i={release.published ? "eye-off" : "check"} size={16} />
                    {release.published ? "Retirer du téléchargement" : "Publier"}
                  </button>
                </AdminActionForm>
                {!release.published && (
                  <AdminActionForm action={removeRelease}>
                    <input type="hidden" name="id" value={release.id} />
                    <button
                      type="submit"
                      className="admin-form-submit"
                      onClick={(event) => {
                        if (!window.confirm(`Supprimer définitivement la version ${release.version} ?`))
                          event.preventDefault();
                      }}
                    >
                      <Icon i="trash-2" size={16} />
                      Supprimer
                    </button>
                  </AdminActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
