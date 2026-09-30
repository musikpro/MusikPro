"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminMediaPickerModal from "@/components/admin/AdminMediaPickerModal";
import AdminSelect from "@/components/admin/AdminSelect";
import { setTrendingSettings } from "@/app/admin/trending/actions";
import { TRENDING_POOL_SIZE, type TrendingSettingsValue } from "@/lib/trending/types";
import type { GeneratedSongOption } from "@/lib/trending/admin";
import { apiFetch } from "@/lib/api/client";

type TrendingSongDisplay = { songGroupId: string; title: string; styleLabel: string | null; plays: number };
type Slot = { songGroupId: string; cover: string };

function toDisplay(song: TrendingSongDisplay): TrendingSongDisplay {
  return { songGroupId: song.songGroupId, title: song.title, styleLabel: song.styleLabel, plays: song.plays };
}

/**
 * Widget « Tendances » du tableau de bord client : deux cartes au maximum, toujours choisies à la
 * main (plus de mode automatique). Chaque carte = une chanson + une pochette prise dans la page
 * Médias (AdminMediaPickerModal, comme pour /admin/landing-features).
 */
export default function TrendingPanel({
  settings,
  songs,
}: {
  settings: TrendingSettingsValue;
  /** Every completed generation platform-wide (published or not) — feeds the picker. */
  songs: GeneratedSongOption[];
}) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    settings.manualSelection
      .slice(0, TRENDING_POOL_SIZE)
      .map((songGroupId) => ({ songGroupId, cover: settings.coverOverrides[songGroupId] ?? "" })),
  );
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [extraSongs, setExtraSongs] = useState<Record<string, TrendingSongDisplay>>({});
  const [idInput, setIdInput] = useState("");
  const [idLookupPending, setIdLookupPending] = useState(false);
  const [idLookupError, setIdLookupError] = useState("");

  // `songs` only lists the most recent generations — a song added by pasting its "Identifiant"
  // from /admin/generations lands in `extraSongs` so its label still resolves.
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

  const addSlot = (songGroupId: string) => setSlots((prev) => [...prev, { songGroupId, cover: "" }]);

  const addSongById = async () => {
    const trimmed = idInput.trim();
    if (!trimmed) return;
    if (slots.some((slot) => slot.songGroupId === trimmed)) {
      setIdLookupError("Cette chanson est déjà dans ta sélection.");
      return;
    }
    if (slots.length >= TRENDING_POOL_SIZE) {
      setIdLookupError(`Les tendances sont limitées à ${TRENDING_POOL_SIZE} chansons.`);
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
      addSlot(option.songGroupId);
      setIdInput("");
    } catch (error) {
      setIdLookupError(error instanceof Error ? error.message : "Identifiant introuvable.");
    } finally {
      setIdLookupPending(false);
    }
  };

  const nextFreeSong = songOptions.find((option) => !slots.some((slot) => slot.songGroupId === option.value));
  const savedKey = `${settings.manualSelection.join(",")}|${JSON.stringify(settings.coverOverrides)}`;

  return (
    <section className="admin-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="trending-up" size={20} />
        </span>
        <div>
          <h2>Tendances du tableau de bord</h2>
          <p>Le widget affiche {TRENDING_POOL_SIZE} cartes : choisis la chanson et la pochette de chacune.</p>
        </div>
        <span className="admin-status is-pending">Manuel</span>
      </div>

      <AdminActionForm key={savedKey} action={setTrendingSettings} className="admin-trending-form">
        <div className="admin-trending-section">
          <span className="admin-trending-label">
            Cartes ({slots.length}/{TRENDING_POOL_SIZE})
          </span>
          {songOptions.length === 0 && slots.length === 0 ? (
            <p className="admin-trending-empty-hint">
              Aucune chanson générée pour l’instant — crée une chanson depuis le tableau de bord client pour pouvoir la
              choisir ici.
            </p>
          ) : null}
          <div className="admin-trending-picker">
            {slots.map((slot, index) => {
              const usedElsewhere = new Set(slots.filter((_, i) => i !== index).map((entry) => entry.songGroupId));
              const options = songOptions.filter((option) => !usedElsewhere.has(option.value));
              return (
                <div key={index} className="admin-trending-slot">
                  <div className="admin-trending-picker-row">
                    <AdminSelect
                      ariaLabel={`Chanson de la carte ${index + 1}`}
                      options={options}
                      value={slot.songGroupId}
                      onValueChange={(value) =>
                        setSlots((prev) =>
                          prev.map((entry, i) => (i === index ? { ...entry, songGroupId: value } : entry)),
                        )
                      }
                      name="manualSelection"
                    />
                    <button
                      type="button"
                      className="admin-trending-picker-remove"
                      aria-label="Retirer cette carte"
                      onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Icon i="x" size={15} />
                    </button>
                  </div>
                  <input type="hidden" name="cover" value={slot.cover} />
                  <div className="admin-trending-slot-cover">
                    {slot.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slot.cover} alt="" className="admin-landing-feature-cover-preview" />
                    ) : (
                      <p className="admin-trending-empty-hint">
                        Aucune pochette : la carte affichera le logo MusikPro. Choisis une image pour la remplacer.
                      </p>
                    )}
                    <div className="admin-btn-row">
                      <button type="button" className="admin-secondary-action" onClick={() => setPickerIndex(index)}>
                        <Icon i="image" size={15} />
                        {slot.cover ? "Changer la pochette" : "Choisir la pochette"}
                      </button>
                      {slot.cover ? (
                        <button
                          type="button"
                          className="admin-secondary-action"
                          onClick={() =>
                            setSlots((prev) => prev.map((entry, i) => (i === index ? { ...entry, cover: "" } : entry)))
                          }
                        >
                          <Icon i="x" size={15} /> Retirer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {slots.length < TRENDING_POOL_SIZE && nextFreeSong ? (
              <button type="button" className="admin-trending-add" onClick={() => addSlot(nextFreeSong.value)}>
                <Icon i="plus" size={14} />
                Ajouter une chanson
              </button>
            ) : null}
          </div>
          <AdminMediaPickerModal
            open={pickerIndex !== null}
            selectedUrl={pickerIndex !== null ? (slots[pickerIndex]?.cover ?? "") : ""}
            onSelect={(url) => {
              setSlots((prev) => prev.map((entry, i) => (i === pickerIndex ? { ...entry, cover: url } : entry)));
              setPickerIndex(null);
            }}
            onClose={() => setPickerIndex(null)}
          />
          {slots.length < TRENDING_POOL_SIZE ? (
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
                  <Icon
                    i={idLookupPending ? "loader-circle" : "plus"}
                    size={14}
                    className={idLookupPending ? "animate-spin" : undefined}
                  />
                  Ajouter
                </button>
              </div>
              <small>
                Seules les générations les plus récentes apparaissent dans la liste — pour une chanson plus ancienne,
                copie son identifiant depuis « Générations » et colle-le ici.
              </small>
              {idLookupError ? (
                <p className="admin-trending-empty-hint admin-trending-empty-hint--error">{idLookupError}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="admin-trending-section">
          <span className="admin-trending-label">Aperçu — ce que voient les clients</span>
          {slots.length === 0 ? (
            <p className="admin-trending-empty-hint">Choisis au moins une chanson ci-dessus.</p>
          ) : (
            <div className="admin-trending-preview">
              {slots.map((slot, index) => {
                const song = bySongGroupId.get(slot.songGroupId);
                return (
                  <div key={index} className="admin-trending-preview-card">
                    <div className="admin-trending-preview-media">
                      {slot.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slot.cover} alt="" className="admin-trending-preview-cover" />
                      ) : (
                        <div className="admin-trending-preview-brand">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icon.svg" alt="" />
                        </div>
                      )}
                      <div className="admin-trending-preview-overlay">
                        <strong>{song?.title ?? "Chanson"}</strong>
                        <span>
                          <Icon i="headphones" size={11} /> {song?.plays ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
