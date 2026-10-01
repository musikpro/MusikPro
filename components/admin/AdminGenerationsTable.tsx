"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

export type AdminGenerationRow = {
  id: string;
  songGroupId: string | null;
  userEmail: string | null;
  title: string | null;
  occasion: string | null;
  /** Full AI-directive prompt sent to Musicful (see lib/ai/songs.ts:extractGenreLabel) — kept for the hover tooltip, never rendered directly. */
  style: string | null;
  styleLabel: string | null;
  versionLabel: string | null;
  status: string;
  provider: string;
  model: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  failureReason: string | null;
  /** Raw numeric `status` last reported by the provider (Musicful: 0 = finished, 4 observed on failed tasks). */
  providerStatus: number | null;
  /** Seconds from creation to the final state, or to now while still pending. */
  elapsedSeconds: number | null;
  createdAt: string;
};

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

export default function AdminGenerationsTable({ rows }: { rows: AdminGenerationRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const showToast = useAdminToast();

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

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return rows.filter(
      (row) =>
        (status === "all" || row.status === status) &&
        (!needle ||
          `${row.userEmail ?? ""} ${row.title ?? ""} ${row.occasion ?? ""} ${row.style ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(needle)),
    );
  }, [query, rows, status]);

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
    <section className="admin-panel admin-table-panel">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="sr-only" />
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
          {[
            ["all", "Toutes"],
            ["completed", "Terminées"],
            ["processing", "En cours"],
            ["failed", "Échouées"],
          ].map(([value, label]) => (
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
      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Chanson</th>
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
            {filtered.map((row) => (
              <tr key={row.id}>
                <td data-label="Date">{new Date(row.createdAt).toLocaleString("fr-FR")}</td>
                <td data-label="Utilisateur">{row.userEmail ?? "Compte supprimé"}</td>
                <td className="admin-table-primary" data-label="Chanson">
                  <strong>{row.title ?? "Sans titre"}</strong>
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
      {!filtered.length ? (
        <div className="admin-empty-state">
          <Icon i="music-2" size={22} />
          <strong>Aucune génération trouvée</strong>
          <p>Modifie la recherche ou le statut.</p>
        </div>
      ) : null}
    </section>
  );
}
