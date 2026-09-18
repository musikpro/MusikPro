"use client";
const t = (text: string) => text;
import { matchesSongSearch } from "@/lib/demo/search";
import SearchField from "./SearchField";
import { useDemo } from "./DemoProvider";

import { useState } from "react";

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
  const generatedSongs = demo.songs
    .filter(
      (s) =>
        matchesSongSearch(search, s.title, s.style, s.occasion) &&
        (selectedTab !== "Favorites" || demo.favorites.includes(s.title)),
    )
    .slice()
    .sort((a, b) => (selectedTab === "Récentes" ? b.id - a.id : 0));
  return (
    <div className="bg-background flex flex-col font-body">
      <MobileTopBar credits={3} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headings font-bold text-2xl text-foreground">
            {t("Mes chansons")}
          </h1>
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
          {demo.songs.length} chansons ·{" "}
          {demo.songs.reduce((n, s) => n + s.versions.length, 0)} versions
          générées
        </p>
      </div>

      {/* Filter Bar */}
      <div className="px-4 pb-4 flex gap-2">
        <SearchField
          value={search}
          onChange={setSearch}
          label="Rechercher une chanson"
        />
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            demo.notify(
              "Action de démonstration : aucune opération réelle effectuée.",
            )
          }
          aria-label="Filtrer"
          className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-input"
        >
          <Icon
            i="sliders-horizontal"
            size={14}
            className="text-muted-foreground"
          />
        </button>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 pb-4 flex gap-2">
        {[t("Toutes"), t("Récentes"), t("Favorites")].map((tab, i) => (
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

      <p
        role="status"
        aria-live="polite"
        className="px-4 pb-3 text-xs text-muted-foreground"
      >
        {generatedSongs.length} chanson{generatedSongs.length !== 1 ? "s" : ""}{" "}
        trouvée{generatedSongs.length !== 1 ? "s" : ""}
      </p>
      {/* Song Cards */}
      <div className="workspace-song-grid px-4 flex flex-col gap-4 pb-28">
        {generatedSongs.length === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            Aucune chanson pour cette recherche.
          </p>
        )}
        {generatedSongs.map((song) => (
          <div
            key={song.id}
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Card Header */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-headings font-bold text-base text-foreground truncate">
                    {song.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}
                  >
                    {song.style}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {song.occasion}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {song.date}
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() =>
                  demo.notify(
                    "Action de démonstration : aucune opération réelle effectuée.",
                  )
                }
                aria-label="Options"
                className="text-muted-foreground ml-2 mt-0.5"
              >
                <Icon i="more-vertical" size={18} />
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-border mx-4" />

            {/* Versions */}
            <div className="px-4 py-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("Versions")}
              </p>
              {song.versions.map((v, vi) => (
                <div
                  key={vi}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${vi === 0 ? "bg-secondary border border-primary/15" : "bg-input border border-border"}`}
                >
                  {/* Play Button */}
                  <button
                    type="button"
                    data-demo-ready="true"
                    onClick={() => demo.openSong(song.title, vi)}
                    aria-label="Écouter la chanson"
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${vi === 0 ? "bg-primary" : "bg-muted"}`}
                  >
                    <Icon
                      i="play"
                      size={14}
                      className={
                        vi === 0
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }
                    />
                  </button>

                  {/* Version Info + Waveform */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-semibold ${vi === 0 ? "text-primary" : "text-foreground"}`}
                      >
                        {v.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {v.duration}
                      </span>
                    </div>
                    {/* Mini waveform */}
                    <div className="flex items-end gap-0.5 h-4">
                      {[
                        3, 6, 4, 9, 7, 5, 10, 8, 6, 9, 5, 7, 4, 8, 6, 10, 7, 5,
                        8, 4,
                      ].map((h, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-sm ${vi === 0 ? "bg-primary/40" : "bg-muted-foreground/30"}`}
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {v.plays}
                    </span>
                    <button
                      type="button"
                      data-demo-ready="true"
                      aria-label={`Favori ${song.title} ${v.label}`}
                      onClick={() => demo.toggleVersion(song.title, vi)}
                      className={
                        demo.versionFavorites.includes(`${song.title}|${vi}`)
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      <Icon
                        i={
                          demo.versionFavorites.includes(`${song.title}|${vi}`)
                            ? "heart"
                            : "heart"
                        }
                        size={15}
                      />
                    </button>
                    <button
                      type="button"
                      data-demo-ready="true"
                      onClick={() =>
                        demo.notify(
                          "Action de démonstration : aucune opération réelle effectuée.",
                        )
                      }
                      aria-label="Partager"
                      className="text-muted-foreground"
                    >
                      <Icon i="share-2" size={15} />
                    </button>
                    <button
                      type="button"
                      data-demo-ready="true"
                      onClick={() =>
                        demo.notify(
                          "Action de démonstration : aucune opération réelle effectuée.",
                        )
                      }
                      aria-label="Télécharger"
                      className="text-muted-foreground"
                    >
                      <Icon i="download" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Card Footer Actions */}
            <div className="border-t border-border mx-4 mb-3" />
            <div className="px-4 pb-3 flex items-center gap-2">
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.go("/dashboard/create/lyrics/edit")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-input border border-border rounded-lg text-xs font-semibold text-foreground"
              >
                <Icon i="pencil" size={12} />
                {t("Modifier paroles")}
              </button>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.go("/dashboard/create")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-input border border-border rounded-lg text-xs font-semibold text-foreground"
              >
                <Icon i="refresh-cw" size={12} />
                {t("Regénérer")}
              </button>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.removeSong(song.title)}
                aria-label={`Retirer ${song.title} de la démonstration`}
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
