"use client";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";

export const displayName = "Mes chansons";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import SongCard from "./SongCard";
import Icon from "./Icon";

export default function MySongsScreen() {
  const demo = useDemo();
  const mySongs = demo.songs.map((song) => ({
    id: song.id,
    title: song.title,
    style: song.style,
    occasion: song.occasion,
    versions: song.versions.length,
    plays: song.versions.reduce((total, version) => total + version.plays, 0),
    likes: demo.versionFavorites.filter((key) => key.startsWith(`${song.id}|`)).length,
  }));
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Mes chansons")}</h1>
        <p className="text-sm text-muted-foreground">{t("Gérez vos créations musicales")}</p>
      </div>

      {/* Filter/Sort */}
      <div className="px-4 pb-4 flex gap-2">
        <div className="border border-border rounded-lg px-3 py-2 bg-input flex items-center gap-2 flex-1">
          <Icon i="filter" size={14} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t("Trier")}</p>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/songs")}
          aria-label="Voir les versions de mes chansons"
          className="border border-border rounded-lg px-3 py-2 bg-input"
        >
          <Icon i="list" size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* My Songs List */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto space-y-3">
        {mySongs.length === 0 && (
          <p
            role="status"
            className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground"
          >
            Aucune chanson créée pour le moment.
          </p>
        )}
        {mySongs.map((song) => (
          <SongCard key={song.id} {...song} />
        ))}
      </div>

      <MobileBottomNav activeTab={t("Mes chansons")} />
    </div>
  );
}
