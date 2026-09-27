"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { setTrendingSettings } from "@/app/admin/trending/actions";
import { TRENDING_COUNT_OPTIONS, TRENDING_POOL_SIZE, type TrendingSettingsValue, type TrendingCount } from "@/lib/trending/types";
import type { PublishedSongOption } from "@/lib/trending/admin";

export default function TrendingPanel({
  settings,
  songs,
}: {
  settings: TrendingSettingsValue;
  songs: PublishedSongOption[];
}) {
  const [mode, setMode] = useState(settings.mode);
  const [count, setCount] = useState<TrendingCount>(settings.count);
  const [randomize, setRandomize] = useState(settings.randomize);
  const [manualPicks, setManualPicks] = useState<string[]>(() => settings.manualSelection.slice(0, TRENDING_POOL_SIZE));

  const bySongGroupId = useMemo(() => new Map(songs.map((song) => [song.songGroupId, song])), [songs]);

  const songOptions = useMemo(
    () =>
      songs.map((song) => ({
        value: song.songGroupId,
        label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""} · ${song.plays} écoute${song.plays > 1 ? "s" : ""}`,
      })),
    [songs],
  );

  const autoPool = useMemo(
    () => songs.filter((song) => song.plays > 0).slice(0, randomize ? TRENDING_POOL_SIZE : count),
    [songs, count, randomize],
  );
  const manualPool = useMemo(
    () => manualPicks.map((id) => bySongGroupId.get(id)).filter((song): song is PublishedSongOption => Boolean(song)),
    [manualPicks, bySongGroupId],
  );
  const pool = mode === "manual" ? manualPool : autoPool;
  const preview = randomize ? pool : pool.slice(0, count);

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
            {songOptions.length === 0 ? (
              <p className="admin-trending-empty-hint">
                Aucune chanson publiée pour l’instant — publie une chanson depuis « Mes chansons » côté client pour
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
                {manualPicks.length < TRENDING_POOL_SIZE ? (
                  <button
                    type="button"
                    className="admin-trending-add"
                    onClick={() => {
                      const next = songOptions.find((option) => !manualPicks.includes(option.value));
                      setManualPicks((prev) => [...prev, next?.value ?? ""]);
                    }}
                  >
                    <Icon i="plus" size={14} />
                    Ajouter une chanson
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="admin-trending-section">
          <span className="admin-trending-label">
            {randomize ? `Vivier — ${count} seront tirées au hasard à chaque visite` : "Aperçu — ce que voient les clients"}
          </span>
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
