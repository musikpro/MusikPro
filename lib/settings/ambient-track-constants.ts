// Shared between the server-only ambient-track settings (lib/settings/ambient-track.ts) and the
// client picker (components/admin/AmbientMusicPanel.tsx) — kept in its own file (no `server-only`)
// so the client component can import it too. Same convention as TRENDING_POOL_SIZE.
export const AMBIENT_SONG_POOL_SIZE = 10;
