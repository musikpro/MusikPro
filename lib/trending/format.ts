/** "1 200" → "1,2k", matching the compact play-count style already used on the demo trending cards. */
export function formatPlays(plays: number): string {
  if (plays < 1000) return String(plays);
  return `${(plays / 1000).toLocaleString("fr", { maximumFractionDigits: 1 })}k`;
}
