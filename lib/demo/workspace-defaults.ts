import { demoFavoriteSongs, demoGeneratedSongs } from "@/lib/demo/musikpro-data";
import type { WorkspaceSong } from "@/lib/demo/song-types";

export function getWorkspaceDefaults(isDemo: boolean, realBalance = 0) {
  return {
    balance: isDemo ? 5 : realBalance,
    songs: (isDemo ? demoGeneratedSongs : []) as WorkspaceSong[],
    favorites: isDemo ? demoFavoriteSongs.map((song) => song.title) : [],
    versionFavorites: isDemo
      ? demoGeneratedSongs.flatMap((song) =>
          song.versions.flatMap((version, index) => (version.liked ? [`${song.title}|${index}`] : [])),
        )
      : [],
  };
}
