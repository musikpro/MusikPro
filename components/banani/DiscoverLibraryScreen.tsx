"use client";
const t = (text: string) => text;
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
  const results = demo.library.filter((song) =>
    matchesSongSearch(search, song.title, song.style),
  );
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Découvrir la bibliothèque")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Explorez les chansons créées par notre communauté")}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <SearchField
          value={search}
          onChange={setSearch}
          label="Rechercher dans la bibliothèque"
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className="px-4 pb-3 text-xs text-muted-foreground"
      >
        {results.length} chanson{results.length !== 1 ? "s" : ""} trouvée
        {results.length !== 1 ? "s" : ""}
      </p>
      {/* Library Grid */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {results.length === 0 && (
            <div role="status" className="col-span-2 rounded-xl border border-border bg-card px-5 py-8 text-center">
              <Icon i="library" size={26} className="mx-auto mb-2 text-primary" />
              <p className="font-semibold text-foreground">
                {search ? "Aucune chanson trouvée" : "Bibliothèque vide"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? "Essaie une autre recherche."
                  : "Les chansons réellement publiées apparaîtront ici."}
              </p>
            </div>
          )}
          {results.map((song) => (
            <div
              key={song.title}
              className="rounded-xl overflow-hidden relative group"
            >
              <Image ar="1:1" prompt={song.img} className="w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-between p-3">
                <div className="text-left">
                  <span className="inline-block bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
                    {song.style}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">
                    {song.title}
                  </p>
                  <p className="text-white/70 text-xs flex items-center gap-1">
                    <Icon i="headphones" size={10} /> {song.plays}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.openSong(song.title)}
                aria-label="Écouter la chanson"
                className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/90"
              >
                <Icon i="play" size={12} className="text-primary-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Découvrir")} />
    </div>
  );
}
