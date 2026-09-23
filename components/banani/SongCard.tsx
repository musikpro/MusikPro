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
  isPlaying = false,
  isPending = false,
  isFailed = false,
  onPlay,
  onDownload,
}: {
  title?: string;
  style?: string;
  occasion?: string;
  versions?: number;
  plays?: number;
  likes?: number;
  /** Real mode only — lets the caller drive an inline player instead of always navigating away. */
  isPlaying?: boolean;
  isPending?: boolean;
  isFailed?: boolean;
  onPlay?: () => void;
  onDownload?: () => void;
}) {
  const demo = useDemo();
  const disablePlay = isPending || isFailed;
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {onDownload ? (
          <button
            type="button"
            data-demo-ready
            aria-label={`Télécharger ${title}`}
            disabled={disablePlay}
            onClick={onDownload}
            className="w-10 h-10 border border-border rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            <Icon i="download" size={16} className="text-muted-foreground" />
          </button>
        ) : null}
        <button
          type="button"
          data-demo-ready
          aria-label={isPlaying ? `Mettre en pause ${title}` : `Écouter ${title}`}
          aria-pressed={isPlaying}
          disabled={disablePlay}
          onClick={() => (onPlay ? onPlay() : demo.openSong(title))}
          className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-50"
        >
          <Icon
            i={isPending ? "loader-circle" : isFailed ? "circle-alert" : isPlaying ? "pause" : "play"}
            size={16}
            className={`text-primary-foreground ${isPending ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
