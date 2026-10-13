"use client";

import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

export type CarouselSong = {
  key: string | number;
  title: string;
  displayTitle?: string;
  coverUrl: string | null;
  playsLabel: string;
  style: string;
};

/**
 * Carrousel horizontal de chansons sous un lecteur (« À écouter ») : un tap lance la chanson sans recharger la page,
 * un tap sur la carte en cours bascule lecture/pause. La carte active reste centrée quand la piste change.
 * Partagé par le lecteur du visiteur invité et celui du tableau de bord client.
 */
export default function SongCarousel({
  songs,
  activeIndex,
  playing,
  onSelect,
  onToggleActive,
}: {
  songs: CarouselSong[];
  activeIndex: number;
  playing: boolean;
  onSelect: (index: number) => void;
  onToggleActive: () => void;
}) {
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  if (songs.length < 2) return null;
  return (
    <div className="-mx-4 border-t border-border pt-3">
      <div className="mb-3 flex items-baseline justify-between px-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("À écouter")}</p>
        <p className="text-xs text-muted-foreground">{translateTemplate("{count} chansons", { count: songs.length })}</p>
      </div>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1.5"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {songs.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={item.key}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              type="button"
              data-demo-ready="true"
              onClick={() => (active ? onToggleActive() : onSelect(index))}
              aria-label={translateTemplate("Écouter {title}", { title: item.title })}
              aria-current={active ? "true" : undefined}
              className={`relative aspect-square w-36 shrink-0 snap-center overflow-hidden rounded-2xl text-left transition-transform active:scale-95 ${
                active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
            >
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- couverture déjà optimisée côté stockage
                <img src={item.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="musik-trend-brand-cover h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon.svg" alt="" />
                </div>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span
                className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full ${
                  active ? "bg-primary text-primary-foreground" : "bg-black/50 text-white"
                }`}
              >
                <Icon i={active && playing ? "pause" : "play"} size={14} />
              </span>
              <span className="absolute inset-x-0 bottom-0 p-2.5">
                <span className="line-clamp-2 block text-xs font-bold leading-tight text-white">
                  {item.displayTitle ?? item.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-white/75">
                  <Icon i="headphones" size={10} />
                  {item.playsLabel}
                  {item.style ? <span className="truncate">· {item.style}</span> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
