"use client";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";

export const displayName = "Mes Favoris - Chansons Aimées";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";
import Image from "./Image";

const styleColors: Record<string, string> = {
  Afrobeat: "bg-orange-50 text-coral",
  Amapiano: "bg-secondary text-primary",
  Gospel: "bg-green-50 text-success",
  Zouglou: "bg-yellow-50 text-yellow-700",
  "R&B": "bg-purple-50 text-purple-600",
};

export default function MyFavoritesSongs() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Header with Back Button */}
      <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard")}
            aria-label="Action chevron-left"
            className="text-muted-foreground"
          >
            <Icon i="chevron-left" size={20} />
          </button>
          <h1 className="font-headings font-bold text-lg text-foreground">{t("Mes Favoris")}</h1>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.notify("Action de démonstration : aucune opération réelle effectuée.")}
          aria-label="Options"
          className="text-muted-foreground"
        >
          <Icon i="more-vertical" size={18} />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm text-muted-foreground">{demo.favorites.length} chansons favorites</p>
      </div>

      {/* Songs List */}
      <div className="workspace-favorites-grid flex-1 px-4 py-4 flex flex-col gap-3 pb-24">
        {demo.favorites.length === 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            Aucune chanson favorite. Ajoute un favori depuis le lecteur.
          </p>
        )}
        {demo.favoriteSongs.map((song) => (
          <div
            key={song.id}
            className="bg-card border border-border rounded-xl overflow-hidden flex"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Image */}
            <div className="w-24 h-24 flex-shrink-0 relative overflow-hidden">
              {song.img ? (
                <Image ar="1:1" prompt={song.img} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Icon i="music-2" size={32} className="text-primary" />
                </div>
              )}
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.openSong(song.id)}
                aria-label="Écouter la chanson"
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40"
              >
                <Icon i="play" size={16} className="text-primary-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-foreground truncate">{song.title}</h2>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${styleColors[song.style] || "bg-muted text-muted-foreground"}`}
                  >
                    {song.style}
                  </span>
                  <span className="text-xs text-muted-foreground">{song.occasion}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon i="headphones" size={12} />
                  {song.plays}
                </span>
                <button
                  type="button"
                  data-demo-ready="true"
                  onClick={() => demo.toggleFavorite(song.id)}
                  aria-label={`Retirer ${song.title} des favoris`}
                  className="text-red-400"
                >
                  <Icon i="heart" size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
