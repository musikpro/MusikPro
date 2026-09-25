"use client";
import { translate as t } from "@/lib/i18n/translate";
import { matchesSongSearch } from "@/lib/demo/search";
import { downloadAudioFile, shareAudioFile } from "@/lib/demo/audio-actions";
import SearchField from "./SearchField";
import { useDemo } from "./DemoProvider";

import { useEffect, useRef, useState } from "react";

export const displayName = "Mes Chansons Générées";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";

const styleColors: Record<string, string> = {
  Afrobeat: "bg-orange-50 text-coral",
  Amapiano: "bg-secondary text-primary",
  Gospel: "bg-green-50 text-success",
  "R&B": "bg-purple-50 text-purple-600",
  Zouglou: "bg-yellow-50 text-yellow-700",
};

export default function MySongsGenerated() {
  const demo = useDemo();
  const [selectedTab, setTab] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [playingVersion, setPlayingVersion] = useState<string | null>(null);
  const [sortByPlays, setSortByPlays] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (demo.isDemo) return;
    void demo.refreshSongs();
    // Refresh once on mount only: the interval below takes over polling while a song is still processing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.isDemo]);

  const hasPendingSong = demo.songs.some((song) => song.status === "processing");
  useEffect(() => {
    if (demo.isDemo || !hasPendingSong) return;
    const timer = window.setInterval(() => void demo.refreshSongs(), 4000);
    return () => window.clearInterval(timer);
  }, [demo, demo.isDemo, hasPendingSong]);

  const playVersion = (
    versionKey: string,
    audioUrl: string | null | undefined,
    songId: string | number,
    versionIndex: number,
  ) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (playingVersion === versionKey) {
      audio.pause();
      setPlayingVersion(null);
      return;
    }
    audio.src = audioUrl;
    void audio.play();
    setPlayingVersion(versionKey);
    demo.registerPlay(songId, versionIndex);
  };

  const downloadVersion = async (title: string, label: string, audioUrl: string) => {
    const ok = await downloadAudioFile(audioUrl, `${title} — ${label}`);
    if (!ok) demo.notify("Le téléchargement a échoué. Réessaie dans un instant.");
  };

  const shareVersion = async (title: string, label: string, audioUrl: string) => {
    const result = await shareAudioFile(audioUrl, `${title} — ${label}`);
    if (result === "copied") demo.notify("Lien de la chanson copié dans le presse-papiers.");
    if (result === "failed") demo.notify("Impossible de partager cette chanson pour le moment.");
  };

  const totalPlays = (song: (typeof demo.songs)[number]) => song.versions.reduce((n, v) => n + v.plays, 0);
  const generatedSongs = demo.songs
    .filter(
      (s) =>
        matchesSongSearch(search, s.title, s.style, s.occasion) &&
        (selectedTab !== "Favorites" || demo.favorites.includes(s.title)),
    )
    .slice()
    .sort((a, b) => (sortByPlays ? totalPlays(b) - totalPlays(a) : 0));
  return (
    <div className="bg-background flex flex-col font-body">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingVersion(null)}
        onError={() => {
          setPlayingVersion(null);
          demo.notify("Impossible de lire cette chanson pour le moment. Vérifie ta connexion et réessaie.");
        }}
        onStalled={() => demo.notify("La lecture est interrompue par une connexion instable. Patiente ou réessaie.")}
        className="sr-only"
      />
      <MobileTopBar credits={demo.balance} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headings font-bold text-2xl text-foreground">{t("Mes chansons")}</h1>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/create")}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Icon i="plus" size={13} />
            {t("Créer")}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {demo.songs.length} chansons · {demo.songs.reduce((n, s) => n + s.versions.length, 0)} versions générées
        </p>
      </div>

      {/* Filter Bar */}
      <div className="px-4 pb-4 flex gap-2">
        <SearchField value={search} onChange={setSearch} label="Rechercher une chanson" />
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => {
            setSortByPlays((prev) => !prev);
            demo.notify(sortByPlays ? "Tri : plus récentes d'abord." : "Tri : plus écoutées d'abord.");
          }}
          aria-pressed={sortByPlays}
          aria-label="Trier par nombre d'écoutes"
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 ${sortByPlays ? "border-primary bg-secondary" : "border-border bg-input"}`}
        >
          <Icon i="sliders-horizontal" size={14} className={sortByPlays ? "text-primary" : "text-muted-foreground"} />
        </button>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 pb-4 flex gap-2">
        {[t("Toutes"), t("Récentes"), t("Favorites")].map((tab) => (
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => setTab(tab)}
            aria-pressed={tab === selectedTab}
            key={tab}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${selectedTab === tab ? "bg-primary text-primary-foreground" : "bg-input border border-border text-muted-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <p role="status" aria-live="polite" className="px-4 pb-3 text-xs text-muted-foreground">
        {generatedSongs.length} chanson{generatedSongs.length !== 1 ? "s" : ""} trouvée
        {generatedSongs.length !== 1 ? "s" : ""}
      </p>
      {/* Song Cards */}
      <div className="workspace-song-grid px-4 flex flex-col gap-4 pb-28">
        {generatedSongs.length === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            {demo.songs.length === 0
              ? "Aucune chanson créée. Commence ta première création depuis le bouton Créer."
              : "Aucune chanson pour cette recherche."}
          </p>
        )}
        {generatedSongs.map((song) => (
          <div
            key={song.id}
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Card Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-headings font-bold text-base text-foreground truncate">{song.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}
                >
                  {song.style}
                </span>
                <span className="text-xs text-muted-foreground">{song.occasion}</span>
                <span className="text-xs text-muted-foreground">· {song.date}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border mx-4" />

            {/* Versions */}
            <div className="px-4 py-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("Versions")}
              </p>
              {song.versions.map((v, vi) => {
                // Keyed by song.id (unique), not song.title: two songs can share the exact
                // same title (e.g. two "Ma chanson — Anniversaire"), which previously made
                // playing/liking one highlight every same-titled song's version at that index.
                const versionKey = `${song.id}|${vi}`;
                const isPlaying = playingVersion === versionKey;
                const versionStatus = v.status ?? "completed";
                const isPending =
                  !demo.isDemo &&
                  (versionStatus === "queued" || versionStatus === "submitting" || versionStatus === "processing");
                const isFailed = !demo.isDemo && versionStatus === "failed";
                return (
                  <div
                    key={vi}
                    className={`song-version-row flex items-center gap-3 px-3 py-2.5 rounded-lg ${isPlaying ? "is-playing bg-secondary border border-primary" : "bg-input border border-border"}`}
                  >
                    {/* Play Button */}
                    <button
                      type="button"
                      data-demo-ready="true"
                      disabled={isPending || isFailed}
                      onClick={() =>
                        demo.isDemo
                          ? setPlayingVersion(isPlaying ? null : versionKey)
                          : playVersion(versionKey, v.audioUrl, song.id, vi)
                      }
                      aria-label={
                        isPlaying ? `Mettre en pause ${song.title}, ${v.label}` : `Lire ${song.title}, ${v.label}`
                      }
                      aria-pressed={isPlaying}
                      className={`song-inline-play w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPlaying ? "bg-primary" : "bg-muted"} ${isPending || isFailed ? "opacity-50" : ""}`}
                    >
                      <Icon
                        i={isPending ? "loader-circle" : isFailed ? "circle-alert" : isPlaying ? "pause" : "play"}
                        size={16}
                        className={`${isPending ? "animate-spin" : ""} ${isPlaying ? "text-primary-foreground" : "text-muted-foreground"}`}
                      />
                    </button>

                    {/* Version Info + Waveform */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${isPlaying ? "text-primary" : "text-foreground"}`}>
                          {v.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isPending ? "En cours de génération…" : isFailed ? "Échec" : v.duration}
                        </span>
                      </div>
                      {/* Mini waveform */}
                      {!isPending && !isFailed ? (
                        <div
                          className={`song-inline-waveform flex items-end gap-0.5 h-4 ${isPlaying ? "is-playing" : ""}`}
                        >
                          {[3, 6, 4, 9, 7, 5, 10, 8, 6, 9, 5, 7, 4, 8, 6, 10, 7, 5, 8, 4].map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-sm ${isPlaying ? "bg-primary/60" : "bg-muted-foreground/30"}`}
                              style={{ height: `${h}px` }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{v.plays}</span>
                      <button
                        type="button"
                        data-demo-ready="true"
                        aria-label={`Favori ${song.title} ${v.label}`}
                        onClick={() => demo.toggleVersion(song.id, vi)}
                        className={
                          (demo.isDemo ? demo.versionFavorites.includes(`${song.id}|${vi}`) : v.liked)
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }
                      >
                        <Icon i="heart" size={15} />
                      </button>
                      <button
                        type="button"
                        data-demo-ready="true"
                        disabled={!demo.isDemo && (isPending || isFailed)}
                        onClick={() => {
                          if (demo.isDemo) {
                            demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                          } else if (!v.audioUrl) {
                            demo.notify("Cette version n’est pas encore prête à être partagée.");
                          } else {
                            void shareVersion(song.title, v.label, v.audioUrl);
                          }
                        }}
                        aria-label="Partager"
                        className={`text-muted-foreground ${!demo.isDemo && (isPending || isFailed) ? "opacity-50" : ""}`}
                      >
                        <Icon i="share-2" size={15} />
                      </button>
                      <button
                        type="button"
                        data-demo-ready="true"
                        disabled={!demo.isDemo && (isPending || isFailed)}
                        onClick={() => {
                          if (demo.isDemo) {
                            demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                          } else if (!v.audioUrl) {
                            demo.notify("Cette version n’est pas encore prête à être téléchargée.");
                          } else {
                            void downloadVersion(song.title, v.label, v.audioUrl);
                          }
                        }}
                        aria-label="Télécharger"
                        className={`song-download-button ${!demo.isDemo && (isPending || isFailed) ? "opacity-50" : ""}`}
                      >
                        <Icon i="download" size={19} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card Footer Actions */}
            <div className="border-t border-border mx-4 mb-3" />
            <div className="song-card-actions px-4 pb-3">
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.go("/dashboard/create/lyrics/edit")}
                className="song-edit-lyrics-button flex min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-semibold"
              >
                <span className="song-edit-lyrics-icon">
                  <Icon i="pencil" size={14} />
                </span>
                <span className="song-card-action-label">{t("Modifier paroles")}</span>
              </button>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.go("/dashboard/create")}
                className="song-regenerate-button flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-input px-2.5 py-2 text-xs font-semibold text-foreground"
              >
                <span className="song-card-action-icon">
                  <Icon i="refresh-cw" size={12} />
                </span>
                <span className="song-card-action-label">{t("Régénérer")}</span>
              </button>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => {
                  if (window.confirm(`Supprimer « ${song.title} » et ses versions ? Cette action est définitive.`))
                    demo.removeSong(song.id);
                }}
                aria-label={`Supprimer ${song.title}`}
                className="flex items-center justify-center w-9 h-9 bg-red-50 border border-red-100 rounded-lg flex-shrink-0"
              >
                <Icon i="trash-2" size={14} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <MobileBottomNav activeTab={t("Mes chansons")} />
    </div>
  );
}
