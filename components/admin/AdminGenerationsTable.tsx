"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminSongTitleEditor from "@/components/admin/AdminSongTitleEditor";
import { fetchGenerationsPage } from "@/app/admin/generations/actions";
import type { AdminGenerationRow, GenerationStatusFilter, GenerationsPage } from "@/lib/admin/generations-types";

export type { AdminGenerationRow };

const STATUS_FILTER_OPTIONS: [GenerationStatusFilter, string][] = [
  ["all", "Toutes"],
  ["completed", "Terminées"],
  ["processing", "En cours"],
  ["failed", "Échouées"],
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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const playRow = (row: AdminGenerationRow) => {
    const audio = audioRef.current;
    if (!audio || !row.audioUrl) return;
    if (playingId === row.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = row.audioUrl;
    void audio.play();
    setPlayingId(row.id);
  };

  return (
    <section ref={panelRef} className="admin-panel admin-table-panel admin-generations-panel" aria-busy={isLoading}>
      <audio ref={audioRef} onPause={() => setPlayingId(null)} onEnded={() => setPlayingId(null)} className="sr-only" />
      <div className="admin-catalog-toolbar admin-table-toolbar">
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">Rechercher une génération</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Utilisateur, titre, occasion ou style…"
          />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}>
              <Icon i="x" size={15} />
            </button>
          ) : null}
        </label>
        <div className="admin-filter-tabs">
          {STATUS_FILTER_OPTIONS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? "is-active" : undefined}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={`admin-data-table-wrap${isLoading ? " is-loading" : ""}`}>
        <table className="admin-data-table admin-generations-table">
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
              <th>
                <span className="sr-only">Écoute</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-status={row.status}>
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
                <td data-label="Identifiant">
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
                <td className="admin-generation-style" data-label="Style" title={row.style ?? undefined}>
                  {row.styleLabel ?? "—"}
                </td>
                <td data-label="Fournisseur">
                  {row.provider}
                  <br />
                  <small>{row.model}</small>
                </td>
                <td data-label="Durée">{formatDuration(row.durationSeconds)}</td>
                <td data-label="Statut">
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
                <td data-label="Délai">
                  {formatElapsed(row.elapsedSeconds)}
                  {!["completed", "failed", "cancelled"].includes(row.status) &&
                  (row.elapsedSeconds ?? 0) > SLOW_PENDING_SECONDS ? (
                    <small className="admin-generation-failure">
                      <br />
                      Plus lent que d’habitude
                    </small>
                  ) : null}
                </td>
                <td data-label="Écoute">
                  <button
                    type="button"
                    disabled={!row.audioUrl}
                    onClick={() => playRow(row)}
                    aria-label={
                      playingId === row.id
                        ? `Mettre en pause ${row.title ?? "cette version"}`
                        : `Écouter ${row.title ?? "cette version"}`
                    }
                    aria-pressed={playingId === row.id}
                    className="admin-generation-play"
                  >
                    <Icon i={playingId === row.id ? "pause" : "play"} size={15} />
                  </button>
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
