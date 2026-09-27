"use client";

export default function PublicSongPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  return (
    <audio
      controls
      controlsList="nodownload"
      onContextMenu={(event) => event.preventDefault()}
      src={audioUrl}
      aria-label={title}
      className="w-full"
    />
  );
}
