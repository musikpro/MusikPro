"use client";

import CardAudioPlayer from "./CardAudioPlayer";
import Icon from "./Icon";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

export type GuestSongCardData = {
  key: string;
  title: string;
  displayTitle?: string;
  playsLabel: string;
  coverUrl: string | null;
  audioUrl: string | null;
};

/**
 * Carte de chanson du visiteur invité : même lecteur interne que les « Tendances » du tableau de bord client (la carte
 * se transforme en lecteur), avec un vrai bouton lecture. Aucune navigation vers une page de compte.
 */
export default function GuestSongCard({
  song,
  playing,
  onToggle,
  onClose,
}: {
  song: GuestSongCardData;
  playing: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden relative">
      {playing && song.audioUrl ? (
        <CardAudioPlayer title={song.title} audioUrl={song.audioUrl} onClose={onClose} compact />
      ) : null}
      {song.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- couverture déjà optimisée côté stockage
        <img src={song.coverUrl} alt="" className="w-full aspect-square object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="musik-trend-brand-cover w-full aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3 pointer-events-none">
        <p className="text-white font-bold text-xs">{song.displayTitle ?? song.title}</p>
        <p className="text-white/70 text-xs flex items-center gap-1">
          <Icon i="headphones" size={10} />
          {song.playsLabel}
        </p>
      </div>
      {playing ? null : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={translateTemplate("Écouter la chanson — {title}", { title: song.title })}
          title={t("Écouter la chanson")}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center"
        >
          <Icon i="play" size={20} className="text-primary-foreground" />
        </button>
      )}
    </div>
  );
}
