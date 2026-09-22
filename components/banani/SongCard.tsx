"use client";
import { useDemo } from "./DemoProvider";
import { translate as t } from "@/lib/i18n/translate";

import Icon from "./Icon";

export const displayName = "Song Card";
export const shortDescription = "A card showing a user song with play controls";

export default function SongCard({
  title = "Pour toi Mariam",
  style = "Afrobeat",
  occasion = "Anniversaire",
  versions = 2,
  plays = 1240,
  likes = 87,
}) {
  const demo = useDemo();
  return (
    <div
      className="bg-card rounded-lg border border-border p-4 flex items-center gap-3"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon i="music-2" size={22} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base text-foreground truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{style}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{occasion}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Icon i="layers" size={11} /> {versions} {t("versions")}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Icon i="headphones" size={11} /> {plays}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Icon i="heart" size={11} /> {likes}
          </span>
        </div>
      </div>
      <button
        type="button"
        data-demo-ready
        aria-label={`Écouter ${title}`}
        onClick={() => demo.openSong(title)}
        className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0"
      >
        <Icon i="play" size={16} className="text-primary-foreground" />
      </button>
    </div>
  );
}
