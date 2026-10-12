/**
 * Consignes d'écriture des paroles, rédigées par le propriétaire dans le catalogue : une par occasion (fond, ton,
 * thèmes) et une par style musical (forme : flow, métrique, vocabulaire, expressions). Elles sont envoyées à l'IA
 * génératrice de paroles — pas à l'IA musicale, qui garde ses propres consignes en anglais (aiHint / aiDescription).
 */
export const LYRICS_GUIDANCE_MAX_LENGTH = 600;

export type LyricsGuidance = { occasion: string; style: string };

/** Bloc inséré dans la demande de paroles ; vide quand le propriétaire n'a rien rédigé (comportement d'avant). */
export function buildLyricsGuidanceBlock(
  names: { occasion: string; style: string },
  guidance: Partial<LyricsGuidance> = {},
): string {
  const lines: string[] = [];
  const occasion = guidance.occasion?.trim();
  const style = guidance.style?.trim();
  if (occasion)
    lines.push(`- Consigne de l'occasion « ${names.occasion} » (fond, ton et thèmes des paroles): ${occasion}`);
  if (style)
    lines.push(
      `- Consigne du style musical « ${names.style} » (forme des paroles: métrique, rythme des phrases, vocabulaire, structure, expressions typiques): ${style}`,
    );
  if (!lines.length) return "";
  return (
    `Consignes d'écriture du catalogue MusikPro (à appliquer en priorité pour l'écriture des paroles, sans les citer):\n${lines.join("\n")}\n` +
    "La langue des paroles est TOUJOURS celle du champ « Langue » ci-dessus, choisie par le client : elle prime sur toute mention de langue dans ces consignes."
  );
}
