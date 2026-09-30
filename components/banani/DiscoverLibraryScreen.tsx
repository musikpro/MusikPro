"use client";
import { translate as t } from "@/lib/i18n/translate";
import { matchesSongSearch } from "@/lib/demo/search";
import SearchField from "./SearchField";
import { useDemo } from "./DemoProvider";

import { useState } from "react";

export const displayName = "Découvrir — Bibliothèque";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";
import Image from "./Image";

export default function DiscoverLibraryScreen() {
  const demo = useDemo();
  const [search, setSearch] = useState("");
  const results = demo.library.filter((song) => matchesSongSearch(search, song.title, song.style));
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Découvrir la bibliothèque")}</h1>
        <p className="text-sm text-muted-foreground">{t("Explorez les chansons créées par notre communauté")}</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <SearchField value={search} onChange={setSearch} label="Rechercher dans la bibliothèque" />
      </div>

      <p role="status" aria-live="polite" className="px-4 pb-3 text-xs text-muted-foreground">
        {results.length} chanson{results.length !== 1 ? "s" : ""} trouvée
        {results.length !== 1 ? "s" : ""}
      </p>
      {/* Library Grid */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {results.length === 0 && (
            <div role="status" className="col-span-3 rounded-xl border border-border bg-card px-5 py-8 text-center">
              <Icon i="library" size={26} className="mx-auto mb-2 text-primary" />
              <p className="font-semibold text-foreground">{search ? "Aucune chanson trouvée" : "Bibliothèque vide"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "Essaie une autre recherche."
                  : "Les chansons créées par la communauté apparaîtront ici automatiquement."}
              </p>
            </div>
          )}
          {results.map((song, index) => {
            const { cover } = song as { cover?: string | null };
            return (
              <div key={song.id} className="rounded-xl overflow-hidden relative group">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="w-full aspect-square object-cover" />
                ) : song.img ? (
                  <Image ar="1:1" prompt={song.img} className="w-full" />
                ) : (
                  <div className="musik-trend-brand-cover w-full aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.svg" alt="" />
                  </div>
                )}
                <div className="discover-card-overlay absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                <span className="discover-card-number absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/55 px-2 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <button
                  type="button"
                  data-demo-ready="true"
                  onClick={() => demo.openSong(song.id)}
                  aria-label={`${t("Écouter la chanson")} ${index + 1}`}
                  className="discover-card-play absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90"
                >
                  <Icon i="play" size={16} className="text-primary-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Découvrir")} />
    </div>
  );
}
