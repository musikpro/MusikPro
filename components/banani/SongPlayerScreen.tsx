"use client";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { downloadAudioFile, shareAudioFile } from "@/lib/demo/audio-actions";
import { useDemo } from "./DemoProvider";

export const displayName = "Lecteur de chanson";
export const screenSize = "mobile";

import { useEffect, useState } from "react";
import MobileTopBar from "./MobileTopBar";
import Icon from "./Icon";
import SongPlayer from "./SongPlayer";
import type { CarouselSong } from "./SongCarousel";
import { pickRandom } from "@/lib/discover/pick-random";
import { formatPlays } from "@/lib/trending/format";

const CAROUSEL_SIZE = 20;

export default function SongPlayerScreen() {
  const demo = useDemo();
  const currentSong = demo.currentSong;
  const isReal = !demo.isDemo;
  const isPending = isReal && currentSong?.status && currentSong.status !== "completed";
  const audioUrl = isReal ? currentSong?.audioUrl : null;
  // Partage et téléchargement sont réservés au compte propriétaire : une chanson de la communauté
  // (Découvrir, Tendances…) reste écoutable mais n'est ni téléchargeable ni partageable par les autres.
  // Carrousel « À écouter » : 20 chansons de la bibliothèque tirées au hasard à l'arrivée sur le lecteur (jamais
  // retirées ensuite : choisir une carte ne remélange pas). Une chanson sans fichier audio ne peut pas être jouée.
  const queue = demo.library;
  const playable = queue.filter((song) => !isReal || Boolean((song as { audioUrl?: string | null }).audioUrl));
  const [carousel, setCarousel] = useState<(typeof queue)[number][]>([]);
  useEffect(() => {
    if (carousel.length || !playable.length) return;
    const picked = pickRandom(playable, CAROUSEL_SIZE);
    const current = playable.find((song) => song.id === currentSong?.id);
    // La chanson en cours fait partie de la liste (en tête) pour que sa carte soit mise en avant.
    // Tirage côté client après l'hydratation (un tirage au rendu différerait entre serveur et navigateur).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarousel(current && !picked.includes(current) ? [current, ...picked.slice(0, CAROUSEL_SIZE - 1)] : picked);
    // Volontaire : tirage unique par arrivée sur l'écran (la bibliothèque peut se rafraîchir en arrière-plan).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playable.length]);
  const activeIndex = carousel.findIndex((song) => song.id === currentSong?.id);
  const carouselSongs: CarouselSong[] = carousel.map((song) => {
    const { cover, displayTitle } = song as { cover?: string | null; displayTitle?: string };
    return {
      key: song.id,
      title: song.title,
      displayTitle,
      coverUrl: cover ?? null,
      playsLabel: typeof song.plays === "number" ? formatPlays(song.plays) : String(song.plays ?? 0),
      style: song.style ?? "",
    };
  });
  // Précédent/suivant suivent l'ordre du carrousel quand la chanson en cours y figure, sinon la bibliothèque.
  const step = (direction: number) => {
    if (activeIndex === -1 || carousel.length < 2) return demo.nextSong(direction);
    demo.selectSong(carousel[(activeIndex + direction + carousel.length) % carousel.length].id);
  };
  const canExport = !isReal || demo.songs.some((song) => song.id === currentSong?.id);

  // A visitor can land here while the song is still "processing": DemoProvider polls the library until
  // every version is done, so this screen switches to the player by itself, without a reload.

  if (!currentSong) {
    return (
      <div className="bg-background flex min-h-full flex-col">
        <MobileTopBar credits={demo.balance} />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <Icon i="music-2" size={38} className="mx-auto mb-3 text-primary" />
            <h1 className="font-headings text-xl font-bold text-foreground">{t("Aucune chanson sélectionnée")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Tes chansons réelles pourront être écoutées ici.")}
            </p>
            <button
              type="button"
              onClick={() => demo.go("/dashboard/songs")}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              {t("Voir mes chansons")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col h-full">
      <MobileTopBar credits={demo.balance} />
      <div className="flex-1 pt-4">
        <SongPlayer
          title={currentSong.title}
          subtitle={currentSong.artist}
          coverUrl={currentSong.cover}
          audioUrl={audioUrl ?? null}
          style={currentSong.style}
          infoRight={
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.toggleFavorite(currentSong.id)}
              aria-pressed={demo.favorites.includes(currentSong.id)}
              aria-label={translateTemplate("Favori {title}", { title: currentSong.title })}
              className={`flex items-center gap-1.5 font-semibold ${demo.favorites.includes(currentSong.id) ? "text-red-400" : "text-primary"}`}
            >
              <Icon i="heart" size={18} className={demo.favorites.includes(currentSong.id) ? "fill-current" : ""} />
              <span className="text-sm">{currentSong.likes}</span>
            </button>
          }
          playing={demo.playing}
          onPlayingChange={demo.setPlaying}
          onPrevious={() => step(-1)}
          // Fin de chanson : on enchaîne sur la suivante de la file ; seule dans la bibliothèque, on s'arrête.
          onNext={carousel.length > 1 || queue.length > 1 ? () => step(1) : undefined}
          pending={isPending ? { failed: currentSong.status === "failed" } : null}
          idleTimes={{ elapsed: "1:41", total: currentSong.duration }}
          onPlayRequested={() => {
            if (isReal && audioUrl) demo.registerPlay(currentSong.id, demo.selectedVersion);
          }}
          onAudioError={() =>
            demo.notify(t("Impossible de lire cette chanson pour le moment. Vérifie ta connexion et réessaie."))
          }
          onAudioStalled={() =>
            demo.notify(t("La lecture est interrompue par une connexion instable. Patiente ou réessaie."))
          }
          onMuteWithoutAudio={() =>
            demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true })
          }
          extras={
            canExport ? (
              <div className="flex items-center justify-center gap-3 pb-5">
                <button
                  type="button"
                  data-demo-ready="true"
                  disabled={Boolean(isPending)}
                  onClick={async () => {
                    if (!audioUrl) {
                      demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
                      return;
                    }
                    const result = await shareAudioFile(audioUrl, currentSong.title);
                    if (result === "copied") demo.notify(t("Lien de la chanson copié dans le presse-papiers."));
                    if (result === "failed") demo.notify(t("Impossible de partager cette chanson pour le moment."));
                  }}
                  className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icon i="share-2" size={16} />
                  {t("Partager")}
                </button>
                <button
                  type="button"
                  data-demo-ready="true"
                  disabled={Boolean(isPending)}
                  onClick={async () => {
                    if (!audioUrl) {
                      demo.notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
                      return;
                    }
                    const ok = await downloadAudioFile(audioUrl, currentSong.title);
                    if (!ok) demo.notify(t("Le téléchargement a échoué. Réessaie dans un instant."));
                  }}
                  className="flex-1 py-3 border border-border rounded-xl font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Icon i="download" size={16} />
                  {t("Télécharger")}
                </button>
              </div>
            ) : null
          }
          carousel={{
            songs: carouselSongs,
            activeIndex,
            onSelect: (index) => demo.selectSong(carousel[index].id),
          }}
        />
      </div>
    </div>
  );
}
