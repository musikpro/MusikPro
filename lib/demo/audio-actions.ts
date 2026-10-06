import { extensionForContentType, sanitizeDownloadName } from "@/lib/songs/audio-file";

/**
 * Android natif (application Capacitor) : la WebView n'enregistre pas un lien `blob:` avec l'attribut `download`.
 * Le téléchargement passe alors par la route serveur, dont la réponse « attachment » est prise en charge par le
 * `DownloadListener` de `MainActivity` (dossier Téléchargements + notification Android).
 */
function isAndroidNativeApp(): boolean {
  const capacitor = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return capacitor?.getPlatform?.() === "android";
}

/**
 * iPhone (application Capacitor) : WKWebView n'enregistre pas non plus un lien `blob:` avec `download`.
 * Le fichier est donc lu via la même route serveur (même origine, session de l'utilisateur) puis remis à la
 * feuille de partage iOS, qui propose « Enregistrer dans Fichiers », AirDrop, WhatsApp, etc.
 */
function isIosNativeApp(): boolean {
  const capacitor = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return capacitor?.getPlatform?.() === "ios";
}

async function downloadViaShareSheet(audioUrl: string, baseName: string): Promise<boolean> {
  try {
    const target = `/api/songs/download?${new URLSearchParams({ url: audioUrl, name: baseName })}`;
    const response = await fetch(target, { credentials: "same-origin" });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const blob = await response.blob();
    const file = new File([blob], `${sanitizeDownloadName(baseName)}.${extensionForContentType(contentType)}`, {
      type: contentType,
    });
    if (!navigator.canShare?.({ files: [file] })) return false;
    await navigator.share({ files: [file], title: baseName });
    return true;
  } catch (error) {
    // Fermeture de la feuille de partage par l'utilisateur : ce n'est pas un échec du téléchargement.
    return error instanceof DOMException && error.name === "AbortError";
  }
}

async function downloadViaNativeManager(audioUrl: string, baseName: string): Promise<boolean> {
  try {
    const target = `/api/songs/download?${new URLSearchParams({ url: audioUrl, name: baseName })}`;
    // Vérifie l'accès avant de naviguer : une erreur serveur (JSON) ne doit jamais remplacer la page de l'application.
    const probe = await fetch(target, { method: "HEAD", credentials: "same-origin" });
    if (!probe.ok) return false;
    const link = document.createElement("a");
    link.href = target;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}

export async function downloadAudioFile(audioUrl: string, baseName: string): Promise<boolean> {
  if (isAndroidNativeApp()) return downloadViaNativeManager(audioUrl, baseName);
  if (isIosNativeApp()) return downloadViaShareSheet(audioUrl, baseName);
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("download_failed");
    const extension = extensionForContentType(response.headers.get("content-type") || "");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${baseName.replace(/[\\/:*?"<>|]/g, "_")}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}

export async function shareLink(
  url: string,
  title: string,
  text: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

export async function shareAudioFile(audioUrl: string, title: string) {
  return shareLink(audioUrl, title, "Écoute cette chanson créée sur MusikPro !");
}
