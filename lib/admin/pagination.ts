/** Logique de pagination partagée (pure, sans accès base) : bornes de page et fenêtre de numéros avec ellipses. */

export type PageItem = number | "gap";

/** Nombre de pages pour `total` éléments (au moins 1, même sans résultat, pour garder une page vide cohérente). */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** Ramène un numéro de page demandé dans l'intervalle [1, pageCount]. */
export function clampPage(page: number, total: number, pageSize: number): number {
  const last = pageCount(total, pageSize);
  if (!Number.isFinite(page)) return 1;
  return Math.min(last, Math.max(1, Math.trunc(page)));
}

/** Position affichée « 51–100 sur 237 » : premier et dernier élément de la page (0–0 quand il n'y a rien). */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize) };
}

/**
 * Numéros à afficher : toujours la première et la dernière page, la page courante et ses voisines, et un
 * « gap » à la place de chaque trou (jamais pour un trou d'une seule page, qu'on affiche plutôt).
 */
export function pageWindow(current: number, last: number, siblings = 1): PageItem[] {
  if (last <= 1) return [1];
  const wanted = new Set<number>([1, last]);
  for (let page = current - siblings; page <= current + siblings; page += 1) {
    if (page >= 1 && page <= last) wanted.add(page);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined) {
      if (page - previous === 2) items.push(previous + 1);
      else if (page - previous > 2) items.push("gap");
    }
    items.push(page);
  });
  return items;
}
