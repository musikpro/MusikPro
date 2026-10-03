/**
 * Planifie l'appel de `onReady` (en pratique markI18nReady) une fois le document ENTIÈREMENT chargé :
 * readyState === "complete" (ou événement `load`), puis deux requestAnimationFrame (comme DemoProvider).
 * Avec le streaming (Suspense autour du layout /dashboard, app/loading.tsx), un segment arrivé tard
 * s'hydrate après le montage du bootstrap : poser l'indicateur dès le montage ferait rendre t() en
 * anglais sur un HTML serveur français (#418). `load` ne part qu'à la fin du flux HTML.
 * Limite résiduelle : un segment dont l'hydratation est encore différée après `load` + 2 frames
 * (chunk JS très lent) peut encore diverger ; ce cas reste rare et se résout par le re-rendu suivant.
 * Renvoie une fonction d'annulation (démontage).
 */
type ReadyWindow = Pick<
  Window,
  "requestAnimationFrame" | "cancelAnimationFrame" | "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout"
>;

/** Filet de sécurité : si `load` ne vient jamais (ressource tierce qui pend), la traduction ne reste pas bloquée. */
export const READY_FALLBACK_MS = 8000;
type ReadyDocument = Pick<Document, "readyState">;

export function scheduleI18nReady(win: ReadyWindow, doc: ReadyDocument, onReady: () => void): () => void {
  let first: number | null = null;
  let second: number | null = null;
  let cancelled = false;
  let started = false;
  let fallback: number | null = null;

  const afterPaint = () => {
    if (cancelled || started) return;
    started = true;
    if (fallback !== null) win.clearTimeout(fallback);
    first = win.requestAnimationFrame(() => {
      second = win.requestAnimationFrame(() => {
        if (!cancelled) onReady();
      });
    });
  };

  const onLoad = () => {
    win.removeEventListener("load", onLoad);
    afterPaint();
  };

  // `load` a pu avoir lieu avant le montage (navigation rapide, cache) : ne pas l'attendre indéfiniment.
  if (doc.readyState === "complete") afterPaint();
  else {
    win.addEventListener("load", onLoad);
    fallback = win.setTimeout(afterPaint, READY_FALLBACK_MS);
  }

  return () => {
    cancelled = true;
    win.removeEventListener("load", onLoad);
    if (fallback !== null) win.clearTimeout(fallback);
    if (first !== null) win.cancelAnimationFrame(first);
    if (second !== null) win.cancelAnimationFrame(second);
  };
}
