"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { setTrendingSettings } from "@/app/admin/trending/actions";
import { TRENDING_COUNT_OPTIONS, TRENDING_POOL_SIZE, type TrendingSettingsValue, type TrendingCount } from "@/lib/trending/types";
import type { GeneratedSongOption, PublishedSongOption } from "@/lib/trending/admin";
import { apiFetch } from "@/lib/api/client";

type TrendingSongDisplay = { songGroupId: string; title: string; styleLabel: string | null; plays: number };

function toDisplay(song: { songGroupId: string; title: string; styleLabel: string | null; plays: number }): TrendingSongDisplay {
  return { songGroupId: song.songGroupId, title: song.title, styleLabel: song.styleLabel, plays: song.plays };
}

export default function TrendingPanel({
  settings,
  songs,
  publishedSongs,
}: {
  settings: TrendingSettingsValue;
  /** Every completed generation platform-wide (published or not) — feeds the manual picker. */
  songs: GeneratedSongOption[];
  /** Published songs only — feeds the automatic-mode preview, matching lib/trending/server.ts's real ranking. */
  publishedSongs: PublishedSongOption[];
}) {
  const [mode, setMode] = useState(settings.mode);
  const [count, setCount] = useState<TrendingCount>(settings.count);
  const [randomize, setRandomize] = useState(settings.randomize);
  const [manualPicks, setManualPicks] = useState<string[]>(() => settings.manualSelection.slice(0, TRENDING_POOL_SIZE));
  const [extraSongs, setExtraSongs] = useState<Record<string, TrendingSongDisplay>>({});
  const [idInput, setIdInput] = useState("");
  const [idLookupPending, setIdLookupPending] = useState(false);
  const [idLookupError, setIdLookupError] = useState("");

  // `songs` only lists the most recent generations (see listRecentGeneratedSongsForAdmin) — a
  // song added by pasting its "Identifiant" from /admin/generations lands here instead, so its
  // label still resolves even though it's outside that recent window.
  const allSongs = useMemo<TrendingSongDisplay[]>(() => {
    const map = new Map<string, TrendingSongDisplay>(songs.map((song) => [song.songGroupId, toDisplay(song)]));
    for (const extra of Object.values(extraSongs)) if (!map.has(extra.songGroupId)) map.set(extra.songGroupId, extra);
    return Array.from(map.values());
  }, [songs, extraSongs]);

  const bySongGroupId = useMemo(() => new Map(allSongs.map((song) => [song.songGroupId, song])), [allSongs]);

  const songOptions = useMemo(
    () =>
      allSongs.map((song) => ({
        value: song.songGroupId,
        label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""} · ${song.plays} écoute${song.plays > 1 ? "s" : ""}`,
      })),
    [allSongs],
  );

  const publishedDisplay = useMemo(() => publishedSongs.map(toDisplay), [publishedSongs]);
  const autoPool = useMemo(
    () => publishedDisplay.filter((song) => song.plays > 0).slice(0, randomize ? TRENDING_POOL_SIZE : count),
    [publishedDisplay, count, randomize],
  );
  const manualPool = useMemo(
    () => manualPicks.map((id) => bySongGroupId.get(id)).filter((song): song is TrendingSongDisplay => Boolean(song)),
    [manualPicks, bySongGroupId],
  );
  const pool = mode === "manual" ? manualPool : autoPool;
  const preview = randomize ? pool : pool.slice(0, count);

  const addSongById = async () => {
    const trimmed = idInput.trim();
    if (!trimmed) return;
    if (manualPicks.includes(trimmed)) {
      setIdLookupError("Cette chanson est déjà dans ta sélection.");
      return;
    }
    if (manualPicks.length >= TRENDING_POOL_SIZE) {
      setIdLookupError(`Tu as déjà atteint la limite de ${TRENDING_POOL_SIZE} chansons.`);
      return;
    }
    setIdLookupPending(true);
    setIdLookupError("");
    try {
      const option = await apiFetch<TrendingSongDisplay>("/api/admin/trending/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songGroupId: trimmed }),
        timeoutMs: 15_000,
      });
      setExtraSongs((prev) => ({ ...prev, [option.songGroupId]: option }));
      setManualPicks((prev) => [...prev, option.songGroupId]);
      setIdInput("");
    } catch (error) {
      setIdLookupError(error instanceof Error ? error.message : "Identifiant introuvable.");
    } finally {
      setIdLookupPending(false);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="trending-up" size={20} />
        </span>
        <div>
          <h2>Tendances du tableau de bord</h2>
          <p>Choisis comment le widget « Tendances » affiché aux clients est alimenté.</p>
        </div>
        <span className={`admin-status ${mode === "auto" ? "is-success" : "is-pending"}`}>
          {mode === "auto" ? "Automatique" : "Manuel"}
        </span>
      </div>

      <AdminActionForm
        key={`${settings.mode}-${settings.count}-${settings.randomize}-${settings.manualSelection.join(",")}`}
        action={setTrendingSettings}
        className="admin-trending-form"
      >
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="count" value={count} />
        <input type="hidden" name="randomize" value={randomize ? "true" : "false"} />

        <div className="admin-trending-section">
          <span className="admin-trending-label">Mode</span>
          <div className="admin-trending-modes">
            <button
              type="button"
              className={`admin-trending-mode-card ${mode === "auto" ? "is-selected" : ""}`}
              onClick={() => setMode("auto")}
            >
              <Icon i="flame" size={18} />
              <strong>Automatique</strong>
              <span>Les chansons publiées les plus écoutées, mises à jour en continu.</span>
            </button>
            <button
              type="button"
              className={`admin-trending-mode-card ${mode === "manual" ? "is-selected" : ""}`}
              onClick={() => setMode("manual")}
            >
              <Icon i="hand" size={18} />
              <strong>Manuel</strong>
              <span>Tu choisis toi-même jusqu&rsquo;à {TRENDING_POOL_SIZE} chansons.</span>
            </button>
          </div>
        </div>

        <div className="admin-trending-section">
          <span className="admin-trending-label">Nombre affiché à la fois</span>
          <div className="admin-trending-count">
            {TRENDING_COUNT_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`admin-trending-count-option ${count === value ? "is-selected" : ""}`}
                onClick={() => setCount(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <label className="admin-check-control admin-trending-random-toggle">
          <input type="checkbox" checked={randomize} onChange={(event) => setRandomize(event.target.checked)} />
          <span>
            Affichage aléatoire
            <small>
              {mode === "manual"
                ? `Tire au hasard ${count} chanson${count > 1 ? "s" : ""} parmi ta sélection (jusqu'à ${TRENDING_POOL_SIZE}) à chaque visite, plutôt que toujours les mêmes.`
                : `Tire au hasard ${count} chanson${count > 1 ? "s" : ""} parmi les ${TRENDING_POOL_SIZE} plus écoutées à chaque visite, plutôt que toujours les mêmes.`}
            </small>
          </span>
        </label>

        {mode === "manual" ? (
          <div className="admin-trending-section">
            <span className="admin-trending-label">
              Chansons éligibles ({manualPicks.length}/{TRENDING_POOL_SIZE})
            </span>
            {songOptions.length === 0 && manualPicks.length === 0 ? (
              <p className="admin-trending-empty-hint">
                Aucune chanson générée pour l’instant — crée une chanson depuis le tableau de bord client pour
                pouvoir la choisir ici.
              </p>
            ) : (
              <div className="admin-trending-picker">
                {manualPicks.map((pick, index) => {
                  const usedElsewhere = new Set(manualPicks.filter((_, i) => i !== index));
                  const options = songOptions.filter((option) => !usedElsewhere.has(option.value) || option.value === pick);
                  return (
                    <div key={index} className="admin-trending-picker-row">
                      <AdminSelect
                        ariaLabel={`Chanson tendance ${index + 1}`}
                        options={options}
                        value={pick}
                        onValueChange={(value) =>
                          setManualPicks((prev) => prev.map((entry, i) => (i === index ? value : entry)))
                        }
                        name="manualSelection"
                      />
                      <button
                        type="button"
                        className="admin-trending-picker-remove"
                        aria-label="Retirer cette chanson"
                        onClick={() => setManualPicks((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Icon i="x" size={15} />
                      </button>
                    </div>
                  );
                })}
                {manualPicks.length < TRENDING_POOL_SIZE && manualPicks.length < songOptions.length ? (
                  <button
                    type="button"
                    className="admin-trending-add"
                    onClick={() => {
                      const next = songOptions.find((option) => !manualPicks.includes(option.value));
                      if (!next) return;
                      setManualPicks((prev) => [...prev, next.value]);
                    }}
                  >
                    <Icon i="plus" size={14} />
                    Ajouter une chanson
                  </button>
                ) : null}
                {songOptions.length > 0 && manualPicks.length >= songOptions.length && manualPicks.length < TRENDING_POOL_SIZE ? (
                  <p className="admin-trending-empty-hint">
                    Les {songOptions.length} chansons récentes affichées ici sont déjà assignées — ajoute-en une par
                    identifiant ci-dessous, ou génères-en d’autres depuis le tableau de bord client.
                  </p>
                ) : null}
              </div>
            )}
            {manualPicks.length < TRENDING_POOL_SIZE ? (
              <div className="admin-trending-add-by-id">
                <label htmlFor="trending-add-by-id">Ajouter par identifiant</label>
                <div className="admin-trending-add-by-id-row">
                  <input
                    id="trending-add-by-id"
                    type="text"
                    value={idInput}
                    onChange={(event) => {
                      setIdInput(event.target.value);
                      setIdLookupError("");
                    }}
                    placeholder="Colle l’identifiant depuis la page « Générations »"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addSongById();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="admin-trending-add"
                    disabled={idLookupPending || !idInput.trim()}
                    onClick={() => void addSongById()}
                  >
                    <Icon i={idLookupPending ? "loader-circle" : "plus"} size={14} className={idLookupPending ? "animate-spin" : undefined} />
                    Ajouter
                  </button>
                </div>
                <small>
                  Seules les {TRENDING_POOL_SIZE} générations les plus récentes apparaissent ci-dessus — pour une
                  chanson plus ancienne, copie son identifiant depuis « Générations » et colle-le ici.
                </small>
                {idLookupError ? <p className="admin-trending-empty-hint admin-trending-empty-hint--error">{idLookupError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="admin-trending-section">
          <span className="admin-trending-label">
            {randomize ? `Vivier — ${count} seront tirées au hasard à chaque visite` : "Aperçu — ce que voient les clients"}
          </span>
          {preview.length > 0 && pool.length < count ? (
            <p className="admin-trending-empty-hint">
              {mode === "manual"
                ? `Seulement ${pool.length} chanson${pool.length > 1 ? "s" : ""} choisie${pool.length > 1 ? "s" : ""} sur ${count} — ajoute-en pour compléter.`
                : `Seulement ${pool.length} chanson${pool.length > 1 ? "s" : ""} publiée${pool.length > 1 ? "s" : ""} avec au moins une écoute sur ${count} demandées — publie-en d’autres depuis « Mes chansons » côté client pour compléter.`}
            </p>
          ) : null}
          {preview.length === 0 ? (
            <p className="admin-trending-empty-hint">
              {mode === "manual" ? "Choisis au moins une chanson ci-dessus." : "Aucune chanson publiée n’a encore d’écoute."}
            </p>
          ) : (
            <div className="admin-trending-preview">
              {preview.map((song) => (
                <div key={song.songGroupId} className="admin-trending-preview-card">
                  <div className="admin-trending-preview-media">
                    <div className="admin-trending-preview-brand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icon.svg" alt="" />
                    </div>
                    <div className="admin-trending-preview-overlay">
                      <strong>{song.title}</strong>
                      <span>
                        <Icon i="headphones" size={11} /> {song.plays}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-trending-actions">
          <button type="submit" className="admin-primary-action admin-trending-save">
            <Icon i="save" size={15} />
            Enregistrer
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
