"use client";
import { useState } from "react";
import { translate as t } from "@/lib/i18n/translate";
import { matchesSongSearch } from "@/lib/demo/search";
import SearchField from "./SearchField";
import { useDemo } from "./DemoProvider";

export const displayName = "Mes Paroles";
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

export default function MyLyricsScreen() {
  const demo = useDemo();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const songsWithLyrics = demo.songs.filter((s) => s.lyrics && s.lyrics.trim().length > 0);
  const results = songsWithLyrics.filter((s) => matchesSongSearch(search, s.title, s.style, s.occasion));
  const copyLyrics = (title: string, lyrics: string) => {
    navigator.clipboard.writeText(lyrics).then(
      () => demo.notify(`Paroles de « ${title} » copiées.`),
      () => demo.notify("La copie est indisponible dans ce navigateur."),
    );
  };
  return (
    <div className="bg-background flex flex-col font-body">
      <MobileTopBar credits={demo.balance} />

      <div className="px-4 pt-4 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Mes paroles")}</h1>
        <p className="text-sm text-muted-foreground">
          {songsWithLyrics.length} chanson{songsWithLyrics.length !== 1 ? "s" : ""} avec paroles
        </p>
      </div>

      <div className="px-4 pb-4">
        <SearchField value={search} onChange={setSearch} label="Rechercher une chanson" />
      </div>

      <p role="status" aria-live="polite" className="px-4 pb-3 text-xs text-muted-foreground">
        {results.length} résultat{results.length !== 1 ? "s" : ""}
      </p>

      <div className="workspace-song-grid px-4 flex flex-col gap-4 pb-28">
        {results.length === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            {songsWithLyrics.length === 0
              ? "Aucune parole disponible. Elles apparaîtront ici une fois une chanson générée."
              : "Aucune chanson pour cette recherche."}
          </p>
        )}
        {results.map((song) => {
          const isOpen = expanded === song.id;
          return (
            <div
              key={song.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => setExpanded(isOpen ? null : song.id)}
                aria-expanded={isOpen}
                className="w-full px-4 pt-4 pb-3 flex items-start justify-between text-left"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-headings font-bold text-base text-foreground truncate">{song.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}
                    >
                      {song.style}
                    </span>
                    <span className="text-xs text-muted-foreground">{song.occasion}</span>
                    <span className="text-xs text-muted-foreground">· {song.date}</span>
                  </div>
                </div>
                <Icon i={isOpen ? "chevron-up" : "chevron-down"} size={18} className="text-muted-foreground ml-2 mt-0.5" />
              </button>
              {isOpen && (
                <>
                  <div className="border-t border-border mx-4" />
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{song.lyrics}</p>
                  </div>
                  <div className="border-t border-border mx-4" />
                  <div className="px-4 py-3 flex gap-2">
                    <button
                      type="button"
                      data-demo-ready="true"
                      onClick={() => copyLyrics(song.title, song.lyrics)}
                      className="flex-1 py-2 bg-secondary border border-primary/30 text-primary font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Icon i="copy" size={14} />
                      {t("Copier")}
                    </button>
                    <button
                      type="button"
                      data-demo-ready="true"
                      onClick={() => demo.go("/dashboard/create/lyrics/edit")}
                      className="flex-1 py-2 bg-input border border-border text-foreground font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <Icon i="pencil" size={14} />
                      {t("Modifier paroles")}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <MobileBottomNav activeTab={t("Mes paroles")} />
    </div>
  );
}
