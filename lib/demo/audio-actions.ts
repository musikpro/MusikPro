export async function downloadAudioFile(audioUrl: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error("download_failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename.replace(/[\\/:*?"<>|]/g, "_");
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
