/**
 * Pictogrammes « étincelles » (style IA) interdits partout dans l'interface : ✨ ✦ ✧ ✩-✰ 🌟 💫.
 * Règle générale du kit (CLAUDE.md, `npm run ui:icons-check`). Le formulaire des champs
 * d'occasion les refuse et les propositions de l'IA en sont nettoyées.
 */
const SPARKLE_GLYPHS = /[✨✦✧✩✪✫✬✭✮✯✰🌟💫]/u;
const SPARKLE_GLYPHS_ALL = /[✨✦✧✩✪✫✬✭✮✯✰🌟💫]/gu;

export function containsSparkleGlyph(text: string): boolean {
  return SPARKLE_GLYPHS.test(text);
}

/** Retire les pictogrammes étincelles (et un éventuel sélecteur de variante resté en tête). */
export function stripSparkleGlyphs(text: string): string {
  return text.replace(SPARKLE_GLYPHS_ALL, "").replace(/^\uFE0F+/, "").trim();
}
