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
type ReadyWindow = Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame" | "addEventListener" | "removeEventListener">;
type ReadyDocument = Pick<Document, "readyState">;

export function scheduleI18nReady(win: ReadyWindow, doc: ReadyDocument, onReady: () => void): () => void {
  let first: number | null = null;
  let second: number | null = null;
  let cancelled = false;

  const afterPaint = () => {
    if (cancelled) return;
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
  else win.addEventListener("load", onLoad);

  return () => {
    cancelled = true;
    win.removeEventListener("load", onLoad);
    if (first !== null) win.cancelAnimationFrame(first);
    if (second !== null) win.cancelAnimationFrame(second);
  };
}
