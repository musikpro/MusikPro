"use client";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";

export const displayName = "Lecteur de chanson";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";
import Image from "./Image";

export default function SongPlayerScreen() {
  const demo = useDemo();
  const currentSong = demo.currentSong;

  if (!currentSong) {
    return (
      <div className="bg-background flex min-h-full flex-col">
        <MobileTopBar credits={demo.balance} />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <Icon i="music-2" size={38} className="mx-auto mb-3 text-primary" />
            <h1 className="font-headings text-xl font-bold text-foreground">Aucune chanson sélectionnée</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tes chansons réelles pourront être écoutées ici.</p>
            <button
              type="button"
              onClick={() => demo.go("/dashboard/songs")}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Voir mes chansons
            </button>
          </div>
        </div>
        <MobileBottomNav activeTab={t("Mes chansons")} />
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col h-full">
      <MobileTopBar credits={demo.balance} />

      {/* Main Player Content */}
      <div className="workspace-player-body flex-1 flex flex-col">
        {/* Now Playing */}
        <div className="px-4 pt-6 pb-4">
          <div className="text-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("En écoute")}
            </span>
          </div>
          <h1 className="font-headings font-bold text-2xl text-foreground text-center">{currentSong.title}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{currentSong.artist}</p>
        </div>

        {/* Album Art */}
        <div className="workspace-album-art px-4 pb-8 flex-1 flex items-center justify-center">
          <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-2xl">
            {currentSong.img ? (
              <Image ar="1:1" prompt={currentSong.img} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Icon i="music-2" size={64} className="text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info */}
        <div className="px-4 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon i="music-2" size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">{currentSong.style}</span>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.toggleFavorite(currentSong.title)}
            aria-pressed={demo.favorites.includes(currentSong.title)}
            aria-label={`Favori ${currentSong.title}`}
            className="flex items-center gap-1.5 text-primary font-semibold"
          >
            <Icon i="heart" size={18} />
            <span className="text-sm">{currentSong.likes}</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="bg-border rounded-full h-1 mb-2">
            <div className="bg-primary h-1 rounded-full" style={{ width: "45%" }}></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1:41</span>
            <span>{currentSong.duration}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="px-4 pb-8 flex items-center justify-center gap-8">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(-1)}
            aria-label="Chanson précédente"
            className="text-muted-foreground"
          >
            <Icon i="skip-back" size={24} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.setPlaying(!demo.playing)}
            aria-label={demo.playing ? "Pause simulée" : "Lecture simulée"}
            className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg"
            style={{ boxShadow: "0 6px 18px rgba(242,101,34,0.35)" }}
          >
            <Icon i={demo.playing ? "pause" : "play"} size={24} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.nextSong(1)}
            aria-label="Chanson suivante"
            className="text-muted-foreground"
          >
            <Icon i="skip-forward" size={24} />
          </button>
        </div>

        {/* Volume Control */}
        <div className="px-4 pb-6 flex items-center justify-center">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.notify("Action de démonstration : aucune opération réelle effectuée.")}
            aria-label="Volume de démonstration"
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Icon i="volume-2" size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-6 flex items-center justify-center gap-3">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.notify("Action de démonstration : aucune opération réelle effectuée.")}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2"
          >
            <Icon i="share-2" size={16} />
            {t("Partager")}
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.notify("Action de démonstration : aucune opération réelle effectuée.")}
            className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2"
          >
            <Icon i="download" size={16} />
            {t("Télécharger")}
          </button>
        </div>
      </div>

      {/* Queue/Up Next */}
      <div className="px-4 pb-6 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("Suivant")}</p>
        <div className="space-y-2">
          {demo.library
            .filter((song) => song.title !== currentSong.title)
            .slice(0, 2)
            .map((song) => (
              <div key={song.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/30">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon i="music-2" size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground">{song.style}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{song.duration}</span>
              </div>
            ))}
          {demo.library.filter((song) => song.title !== currentSong.title).length === 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">Aucune autre chanson</p>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Découvrir")} />
    </div>
  );
}
