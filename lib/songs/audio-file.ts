/**
 * Utilitaires purs (sans accès serveur) pour nommer un fichier audio téléchargé, partagés par le site
 * (`lib/demo/audio-actions.ts`) et la route `GET /api/songs/download`.
 */

/**
 * Musicful doesn't consistently label its finished files: the same song can come back as
 * `audio/mpeg` or as `video/mp4` (an MP4 container holding only an audio track). Naming the
 * download after the response's real content type — instead of always forcing `.mp3` — keeps
 * the saved file's extension honest about what's actually inside it.
 */
export function extensionForContentType(contentType: string): string {
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  return "mp3";
}

const MAX_NAME_LENGTH = 120;
const FALLBACK_NAME = "chanson";

/** Retire tout ce qui pourrait sortir du dossier de téléchargement ou casser un en-tête HTTP. */
export function sanitizeDownloadName(name: string | null | undefined): string {
  const cleaned = (name ?? "")
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[\s.]+$/g, "")
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned || FALLBACK_NAME;
}

/** Version ASCII du nom (accents retirés, le reste remplacé) pour le paramètre `filename=` des anciens clients. */
function asciiFallback(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
}

/** En-tête `Content-Disposition: attachment` avec nom ASCII de repli et nom UTF-8 exact (RFC 6266 / 5987). */
export function attachmentDisposition(baseName: string | null | undefined, extension: string): string {
  const fileName = `${sanitizeDownloadName(baseName)}.${extension}`;
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encoded}`;
}
