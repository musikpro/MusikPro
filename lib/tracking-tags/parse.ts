import { TRACKING_SCRIPT_HOSTS } from "@/lib/security/headers";

/** Balise normalisée, prête à être rendue par components/tracking/TrackingTags.tsx. Aucun HTML brut n'est conservé. */
export type TrackingNode =
  | { kind: "meta"; attrs: Record<string, string> }
  | { kind: "link"; attrs: Record<string, string> }
  | { kind: "script"; src: string | null; inline: string | null }
  | { kind: "pixel"; src: string; width?: string; height?: string };

export const TRACKING_CODE_MAX = 20000;

const META_ATTRS = new Set(["name", "property", "content", "itemprop"]);
const LINK_ATTRS = new Set(["rel", "href", "as", "crossorigin", "type", "sizes"]);
const LINK_RELS = new Set(["preconnect", "dns-prefetch", "preload", "icon", "canonical", "alternate"]);
const PIXEL_ATTRS = new Set(["src", "width", "height", "alt", "style", "height", "border"]);

export class TrackingParseError extends Error {}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (!(name in attrs)) attrs[name] = decodeEntities(value);
  }
  return attrs;
}

function httpsUrl(value: string | undefined, what: string): string {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new TrackingParseError(`${what} : adresse invalide.`);
  }
  if (url.protocol !== "https:") throw new TrackingParseError(`${what} : seule une adresse https:// est acceptée.`);
  return url.toString();
}

function scriptSrc(value: string | undefined): string {
  const href = httpsUrl(value, "Script externe");
  const origin = new URL(href).origin;
  if (!(TRACKING_SCRIPT_HOSTS as readonly string[]).includes(origin)) {
    throw new TrackingParseError(
      `Script externe : le domaine ${origin} n'est pas autorisé par la politique de sécurité (CSP). Domaines acceptés : ${TRACKING_SCRIPT_HOSTS.map((h) => h.replace("https://", "")).join(", ")}.`,
    );
  }
  return href;
}

function pickAttrs(attrs: Record<string, string>, allowed: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(attrs)) if (allowed.has(key)) out[key] = attrs[key];
  return out;
}

/**
 * Analyse un extrait de balises (meta, link, script, noscript contenant une image-pixel) en une liste de nœuds
 * sûrs. Tout le reste (autre balise, gestionnaire on…, http-equiv, script hors domaines autorisés…) est refusé
 * avec un message clair : l'extrait n'est jamais réinjecté tel quel dans la page.
 */
export function parseTrackingCode(raw: string): TrackingNode[] {
  const code = raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!code) throw new TrackingParseError("Le code est vide.");
  if (code.length > TRACKING_CODE_MAX)
    throw new TrackingParseError(`Le code est trop long (${TRACKING_CODE_MAX} caractères maximum).`);

  const nodes: TrackingNode[] = [];
  let rest = code;
  const tagRe = /^<\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/;
  while (rest.length) {
    rest = rest.trimStart();
    if (!rest.length) break;
    const open = tagRe.exec(rest);
    if (!open)
      throw new TrackingParseError(
        "Le code doit être composé uniquement de balises HTML (meta, link, script, noscript).",
      );
    const tag = open[1].toLowerCase();
    const attrs = parseAttrs(open[2]);
    rest = rest.slice(open[0].length);

    if (tag === "meta" || tag === "link") {
      if (Object.keys(attrs).some((k) => k.startsWith("on") || k === "http-equiv" || k === "charset")) {
        throw new TrackingParseError(`<${tag}> : attribut non autorisé (http-equiv, charset ou gestionnaire on…).`);
      }
      if (tag === "meta") {
        if (!attrs.name && !attrs.property && !attrs.itemprop)
          throw new TrackingParseError("<meta> : il faut un attribut name ou property.");
        nodes.push({ kind: "meta", attrs: pickAttrs(attrs, META_ATTRS) });
      } else {
        if (!LINK_RELS.has((attrs.rel ?? "").toLowerCase()))
          throw new TrackingParseError("<link> : valeur de rel non prise en charge.");
        const clean = pickAttrs(attrs, LINK_ATTRS);
        clean.href = httpsUrl(attrs.href, "<link>");
        nodes.push({ kind: "link", attrs: clean });
      }
      continue;
    }

    if (tag === "script") {
      if (open[3])
        throw new TrackingParseError("<script> : balise auto-fermante non valide, utilisez <script>…</script>.");
      const close = /<\/\s*script\s*>/i.exec(rest);
      if (!close) throw new TrackingParseError("<script> : balise fermante </script> manquante.");
      const body = rest.slice(0, close.index);
      rest = rest.slice(close.index + close[0].length);
      const type = (attrs.type ?? "text/javascript").toLowerCase();
      if (type !== "text/javascript" && type !== "application/javascript") {
        throw new TrackingParseError("<script> : seul le type JavaScript classique est accepté.");
      }
      if (attrs.src) {
        if (body.trim()) throw new TrackingParseError("<script src> : un script externe ne doit pas contenir de code.");
        nodes.push({ kind: "script", src: scriptSrc(attrs.src), inline: null });
      } else {
        if (!body.trim()) throw new TrackingParseError("<script> : le script est vide.");
        nodes.push({ kind: "script", src: null, inline: body });
      }
      continue;
    }

    if (tag === "noscript") {
      const close = /<\/\s*noscript\s*>/i.exec(rest);
      if (!close) throw new TrackingParseError("<noscript> : balise fermante manquante.");
      const body = rest.slice(0, close.index).trim();
      rest = rest.slice(close.index + close[0].length);
      const img = /^<\s*img((?:[^>"']|"[^"]*"|'[^']*')*?)\/?>$/i.exec(body);
      if (!img) throw new TrackingParseError("<noscript> : seul un pixel <img> est accepté à l'intérieur.");
      const imgAttrs = parseAttrs(img[1]);
      if (Object.keys(imgAttrs).some((k) => k.startsWith("on") || !PIXEL_ATTRS.has(k))) {
        throw new TrackingParseError("<img> du pixel : attribut non autorisé.");
      }
      nodes.push({
        kind: "pixel",
        src: httpsUrl(imgAttrs.src, "Pixel <img>"),
        width: imgAttrs.width,
        height: imgAttrs.height,
      });
      continue;
    }

    throw new TrackingParseError(`<${tag}> : balise non prise en charge (acceptées : meta, link, script, noscript).`);
  }
  return nodes;
}

/** Version « validation seule » pour les formulaires : renvoie le message d'erreur, ou null si le code est valide. */
export function trackingCodeError(raw: string): string | null {
  try {
    parseTrackingCode(raw);
    return null;
  } catch (error) {
    if (error instanceof TrackingParseError) return error.message;
    throw error;
  }
}
