"use client";

import GuestVinylPlayer from "./GuestVinylPlayer";
import GuestTopBar from "./GuestTopBar";
import Icon from "./Icon";
import { useDemo } from "./DemoProvider";
import { translate as t } from "@/lib/i18n/translate";
import type { DiscoverSong } from "@/lib/discover/types";

/**
 * « Découvrir » pour le visiteur invité : les chansons que leurs créateurs ont partagées, à écouter sans compte dans le
 * lecteur interne des cartes. Aucun accès au compte ; un bouton ramène vers la création de sa propre chanson.
 */
export default function GuestDiscover({ songs }: { songs: DiscoverSong[] }) {
  const demo = useDemo();
  return (
    <div className="bg-background min-h-screen pb-10">
      <GuestTopBar onBack={() => demo.go("/dashboard")} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="px-4 pt-2 pb-1">
          <h1 className="font-headings font-bold text-xl text-foreground">{t("Écouter des chansons")}</h1>
        </div>
        {songs.length ? (
          <GuestVinylPlayer songs={songs} />
        ) : (
          <div role="status" className="mx-4 rounded-xl border border-border bg-card px-5 py-8 text-center">
            <Icon i="library" size={26} className="mx-auto mb-2 text-primary" />
            <p className="font-semibold text-foreground">{t("Bibliothèque vide")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Les chansons partagées par la communauté apparaîtront ici.")}
            </p>
          </div>
        )}
        <div className="px-4 mt-6">
          <button
            type="button"
            onClick={() => demo.go("/dashboard/create")}
            className="musik-create-hero w-full bg-primary rounded-xl px-5 py-4 flex items-center gap-4"
          >
            <div className="text-left flex-1">
              <p className="font-bold text-base text-primary-foreground">{t("Créer ma propre chanson")}</p>
              <p className="text-xs text-primary-foreground/80">{t("Sans compte pour commencer")}</p>
            </div>
            <Icon i="chevron-right" size={18} className="text-primary-foreground/70" />
          </button>
        </div>
      </div>
    </div>
  );
}
