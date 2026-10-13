"use client";

import { useState } from "react";
import Icon from "./Icon";
import SongPlayer from "./SongPlayer";
import { translate as t } from "@/lib/i18n/translate";
import { formatPlays } from "@/lib/trending/format";
import type { DiscoverSong } from "@/lib/discover/types";

/**
 * Lecteur du visiteur invité : le lecteur commun (`SongPlayer`) alimenté par la bibliothèque partagée, sans aucune
 * donnée de compte. La lecture démarre dès l'arrivée et enchaîne sur la chanson suivante.
 */
export default function GuestVinylPlayer({ songs }: { songs: DiscoverSong[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const song = songs[index] ?? null;
  if (!song) return null;

  const select = (next: number) => {
    setIndex((next + songs.length) % songs.length);
    setPlaying(true);
  };

  return (
    <SongPlayer
      title={song.displayTitle ?? song.title}
      subtitle={t("Communauté MusikPro")}
      coverUrl={song.coverUrl}
      audioUrl={song.audioUrl}
      style={song.style ?? ""}
      infoRight={
        <span className="flex items-center gap-1.5">
          <Icon i="headphones" size={14} />
          {formatPlays(song.plays)}
        </span>
      }
      playing={playing}
      onPlayingChange={setPlaying}
      onPrevious={() => select(index - 1)}
      onNext={songs.length > 1 ? () => select(index + 1) : undefined}
      carousel={{
        songs: songs.map((item) => ({
          key: item.songGroupId,
          title: item.title,
          displayTitle: item.displayTitle,
          coverUrl: item.coverUrl,
          playsLabel: formatPlays(item.plays),
          style: item.style ?? "",
        })),
        activeIndex: index,
        onSelect: select,
      }}
    />
  );
}
