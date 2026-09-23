/**
 * Musicful doesn't consistently label its finished files: the same song can come back as
 * `audio/mpeg` or as `video/mp4` (an MP4 container holding only an audio track). Naming the
 * download after the response's real content type — instead of always forcing `.mp3` — keeps
 * the saved file's extension honest about what's actually inside it.
 */
function extensionForContentType(contentType: string): string {
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("ogg")) return "ogg";
  return "mp3";
}

export async function downloadAudioFile(audioUrl: string, baseName: string): Promise<boolean> {
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

export async function shareAudioFile(audioUrl: string, title: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text: "Écoute cette chanson créée sur MusikPro !", url: audioUrl });
      return "shared";
    }
    await navigator.clipboard.writeText(audioUrl);
    return "copied";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}
