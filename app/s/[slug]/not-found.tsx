export default function PublicSongNotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 text-center font-body">
      <h1 className="font-headings font-bold text-xl text-foreground mb-2">Chanson indisponible</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Ce lien n'existe plus ou n'est plus accessible publiquement.
      </p>
      <a href="/" className="font-semibold text-foreground underline">
        Découvrir MusikPro
      </a>
    </main>
  );
}
