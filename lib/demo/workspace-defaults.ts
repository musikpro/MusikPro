import { demoFavoriteSongs, demoGeneratedSongs } from "@/lib/demo/musikpro-data";

export function getWorkspaceDefaults(isDemo: boolean) {
  return {
    balance: isDemo ? 3 : 0,
    songs: isDemo ? demoGeneratedSongs : [],
    favorites: isDemo ? demoFavoriteSongs.map((song) => song.title) : [],
    versionFavorites: isDemo
      ? demoGeneratedSongs.flatMap((song) =>
          song.versions.flatMap((version, index) => (version.liked ? [`${song.title}|${index}`] : [])),
        )
      : [],
  };
}
