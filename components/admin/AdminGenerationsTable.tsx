"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminRowToggle from "@/components/admin/AdminRowToggle";
import AdminTableToolbar from "@/components/admin/AdminTableToolbar";
import AdminSongTitleEditor from "@/components/admin/AdminSongTitleEditor";
import { deleteSong, fetchGenerationsPage, setSongDiscover } from "@/app/admin/generations/actions";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminDeleteSongButton from "@/components/admin/AdminDeleteSongButton";
import type { AdminGenerationRow, GenerationStatusFilter, GenerationsPage } from "@/lib/admin/generations-types";

export type { AdminGenerationRow };

const STATUS_FILTER_OPTIONS: [GenerationStatusFilter, string][] = [
  ["all", "Toutes"],
  ["completed", "Terminées"],
  ["processing", "En cours"],
  ["failed", "Échouées"],
  ["in_discover", "Dans Découvrir"],
  ["not_in_discover", "Hors Découvrir"],
];

const SEARCH_DEBOUNCE_MS = 300;

/** A pending job older than this is flagged as slow — Musicful usually delivers within ~5 minutes. */
const SLOW_PENDING_SECONDS = 300;

const STATUS_LABELS: Record<string, string> = {
  queued: "En file",
  submitting: "Envoi…",
  processing: "En cours",
  completed: "Terminée",
  failed: "Échouée",
  cancelled: "Annulée",
};

function statusTone(status: string) {
  if (status === "completed") return "is-success";
  if (status === "failed" || status === "cancelled") return "is-danger";
  return "is-pending";
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function formatElapsed(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR");
}

export default function AdminGenerationsTable({ initial }: { initial: GenerationsPage }) {
  const [data, setData] = useState<GenerationsPage>(initial);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<GenerationStatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const panelRef = useRef<HTMLElement | null>(null);
  const requestId = useRef(0);
  const showToast = useAdminToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  /** Charge une page sans recharger l'écran ; seule la réponse la plus récente est appliquée. */
  const load = useCallback(
    (page: number, filters: { status: GenerationStatusFilter; query: string }, scrollToTop: boolean) => {
      const current = ++requestId.current;
      startTransition(async () => {
        const result = await fetchGenerationsPage({ page, status: filters.status, query: filters.query });
        if (current !== requestId.current) return;
        if (!result.ok) {
          setLoadError(result.message);
          showToast({ message: result.message, tone: "error" });
          return;
        }
        setLoadError(null);
        setExpandedId(null);
        setData(result.data);
        if (scrollToTop) {
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
    },
    [showToast],
  );

  // Changement de filtre ou de recherche : retour à la page 1 (sans défiler, on est déjà sur la barre d'outils).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    load(1, { status, query: debouncedQuery }, false);
  }, [status, debouncedQuery, load]);

  const copyId = async (songGroupId: string) => {
    try {
      await navigator.clipboard.writeText(songGroupId);
      showToast({
        message: "Identifiant copié — colle-le dans « Tendances » pour ajouter cette chanson.",
        tone: "success",
      });
    } catch {
      showToast({ message: "Impossible de copier l’identifiant.", tone: "error" });
    }
  };

  const rows = data.rows;

  /** Un seul lecteur à la fois : lancer une version met les autres en pause. */
  const pauseOthers = (current: HTMLAudioElement) => {
    document.querySelectorAll<HTMLAudioElement>(".admin-generation-audio").forEach((audio) => {
      if (audio !== current) audio.pause();
    });
  };

  return (
    <section ref={panelRef} className="admin-panel admin-table-panel admin-generations-panel" aria-busy={isLoading}>
      <AdminTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Rechercher une génération"
        placeholder="Utilisateur, titre, occasion ou style…"
        filters={STATUS_FILTER_OPTIONS}
        activeFilter={status}
        onFilterChange={setStatus}
      />
      <div className={`admin-data-table-wrap${isLoading ? " is-loading" : ""}`}>
        <table className="admin-data-table admin-row-table admin-generations-table">
          <thead>
            <tr>
              <th className="admin-generation-date-col">Date</th>
              <th>Utilisateur</th>
              <th className="admin-generation-song-col">Chanson</th>
              <th className="admin-generation-id-col">Identifiant</th>
              <th>Style</th>
              <th>Fournisseur</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>Délai</th>
              <th className="admin-generation-audio-col">Écoute</th>
              <th className="admin-row-toggle-col">
                <span className="sr-only">Détails</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-status={row.status} data-expanded={expandedId === row.id}>
                <td data-label="Date" className="admin-generation-date">
                  <span>{formatDay(row.createdAt)}</span>
                  <small>{formatTime(row.createdAt)}</small>
                </td>
                <td data-label="Utilisateur">{row.userEmail ?? "Compte supprimé"}</td>
                <td className="admin-table-primary" data-label="Chanson">
                  <AdminSongTitleEditor
                    jobId={row.id}
                    title={row.title}
                    onRenamed={() => load(data.page, { status, query: debouncedQuery }, false)}
                  />
                  <small>
                    {row.occasion ?? "Occasion non précisée"}
                    {row.versionLabel ? ` · ${row.versionLabel}` : ""}
                  </small>
                  {row.status === "failed" && row.failureReason ? (
                    <small className="admin-generation-failure">{row.failureReason}</small>
                  ) : null}
                </td>
                <td data-label="Identifiant" data-detail="Identifiant">
                  {row.songGroupId ? (
                    <button
                      type="button"
                      className="admin-generation-id"
                      onClick={() => void copyId(row.songGroupId!)}
                      aria-label={`Copier l’identifiant ${row.songGroupId}`}
                      title={`${row.songGroupId} — copier pour l’ajouter dans « Tendances » par identifiant`}
                    >
                      <code>{row.songGroupId}</code>
                      <Icon i="copy" size={12} />
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className="admin-generation-style"
                  data-label="Style"
                  data-detail="Style"
                  title={row.style ?? undefined}
                >
                  {row.styleLabel ?? "—"}
                </td>
                <td data-label="Fournisseur" data-detail="Fournisseur">
                  {row.provider}
                  <br />
                  <small>{row.model}</small>
                </td>
                <td data-label="Durée" data-detail="Durée">
                  {formatDuration(row.durationSeconds)}
                </td>
                <td data-label="Statut" data-detail="Statut">
                  <span className={`admin-status ${statusTone(row.status)}`}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                  {row.providerStatus !== null ? (
                    <small title="Statut brut renvoyé par le fournisseur lors de la dernière vérification">
                      <br />
                      {row.provider} : statut {row.providerStatus}
                    </small>
                  ) : null}
                </td>
                <td data-label="Délai" data-detail="Délai">
                  {formatElapsed(row.elapsedSeconds)}
                  {!["completed", "failed", "cancelled"].includes(row.status) &&
                  (row.elapsedSeconds ?? 0) > SLOW_PENDING_SECONDS ? (
                    <small className="admin-generation-failure">
                      <br />
                      Plus lent que d’habitude
                    </small>
                  ) : null}
                </td>
                <td data-label="Actions" data-detail="Actions">
                  <div className="admin-table-actions">
                    {row.songGroupId ? (
                      <AdminActionForm
                        action={setSongDiscover}
                        onSuccess={() => load(data.page, { status, query: debouncedQuery }, false)}
                      >
                        <input type="hidden" name="songGroupId" value={row.songGroupId} />
                        <input type="hidden" name="visible" value={row.inDiscover ? "false" : "true"} />
                        <button
                          type="submit"
                          className="admin-generation-discover"
                          disabled={row.status !== "completed"}
                          title={row.status !== "completed" ? "Disponible une fois la chanson terminée" : undefined}
                        >
                          <Icon i={row.inDiscover ? "eye-off" : "library"} size={15} />
                          {row.inDiscover ? "Retirer de Découvrir" : "Ajouter à Découvrir"}
                        </button>
                      </AdminActionForm>
                    ) : null}
                    <AdminActionForm
                      action={deleteSong}
                      onSuccess={() => load(data.page, { status, query: debouncedQuery }, false)}
                    >
                      <input type="hidden" name="jobId" value={row.id} />
                      <AdminDeleteSongButton title={row.title ?? "cette chanson"} versions={row.songGroupId ? 2 : 1} />
                    </AdminActionForm>
                  </div>
                </td>
                <td data-label="Écoute" className="admin-generation-audio-cell">
                  {row.audioUrl ? (
                    <audio
                      className="admin-generation-audio"
                      controls
                      preload="metadata"
                      src={row.audioUrl}
                      aria-label={`Écouter ${row.title ?? "cette version"}`}
                      onPlay={(event) => pauseOthers(event.currentTarget)}
                    />
                  ) : (
                    <span className="admin-generation-no-audio">Pas d’audio</span>
                  )}
                </td>
                <td className="admin-row-toggle-cell">
                  <AdminRowToggle
                    expanded={expandedId === row.id}
                    label={row.title ?? "cette version"}
                    onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <div className="admin-empty-state">
          <Icon i="music-2" size={22} />
          <strong>Aucune génération trouvée</strong>
          <p>Modifie la recherche ou le statut.</p>
        </div>
      ) : null}
      {loadError ? (
        <p className="admin-generations-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <AdminPagination
        page={data.page}
        pageCount={data.pageCount}
        pageSize={data.pageSize}
        total={data.total}
        itemLabel="générations"
        disabled={isLoading}
        onPageChange={(page) => load(page, { status, query: debouncedQuery }, true)}
      />
    </section>
  );
}
