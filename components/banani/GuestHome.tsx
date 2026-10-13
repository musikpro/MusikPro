"use client";

import { useState } from "react";
import { useDemo } from "./DemoProvider";
import GuestSongCard from "./GuestSongCard";
import GuestTopBar from "./GuestTopBar";
import Icon from "./Icon";
import QuickLanguageSelect from "./QuickLanguageSelect";
import { translate as t } from "@/lib/i18n/translate";
import { formatPlays } from "@/lib/trending/format";
import type { TrendingSong } from "@/lib/trending/server";

/**
 * Accueil du visiteur invité (lien `/g/<slug>` dont la destination est « tableau de bord ») : version allégée de
 * l'accueil connecté. Aucune donnée de compte (ni « Mes chansons », ni solde, ni notifications) ; un grand bouton
 * ouvre le parcours de création sans compte, la connexion n'étant demandée qu'au moment de générer les paroles.
 */
export default function GuestHome({ trending }: { trending: TrendingSong[] }) {
  const demo = useDemo();
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  return (
    <div className="bg-background min-h-screen pb-10">
      <GuestTopBar />

      <div className="mx-auto w-full max-w-3xl">
        <div className="dashboard-greeting px-4 pt-4 pb-3">
          <div>
            <h1 className="font-headings font-bold text-2xl text-foreground">{t("Crée ta chanson personnalisée")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Commence sans compte : tu crées ton compte seulement quand tes paroles sont prêtes à être générées.")}
            </p>
          </div>
          <QuickLanguageSelect compact />
        </div>

        <div className="px-4 mb-5">
          <button
            type="button"
            onClick={() => demo.go("/dashboard/create")}
            aria-label={t("Créer une chanson")}
            className="musik-create-hero w-full bg-primary rounded-xl px-5 py-4 flex items-center gap-4"
            style={{ boxShadow: "0 4px 20px rgba(242,101,34,0.35)" }}
          >
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon i="plus" size={22} className="text-primary-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base text-primary-foreground">{t("+ Créer une chanson")}</p>
              <p className="text-xs text-primary-foreground/80">{t("Afrobeat, Amapiano, Gospel…")}</p>
            </div>
            <Icon i="chevron-right" size={18} className="text-primary-foreground/70" />
          </button>
        </div>

        {trending.length ? (
          <section className="px-4" aria-labelledby="guest-trending-title">
            <h2 id="guest-trending-title" className="font-headings font-bold text-lg text-foreground mb-3">
              {t("Tendances")}
            </h2>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))" }}>
              {trending.slice(0, 4).map((song) => (
                <GuestSongCard
                  key={song.slug}
                  song={{
                    key: song.slug,
                    title: song.title,
                    displayTitle: song.displayTitle,
                    playsLabel: formatPlays(song.plays),
                    coverUrl: song.coverUrl,
                    audioUrl: song.audioUrl,
                  }}
                  playing={playingKey === song.slug}
                  onToggle={() => setPlayingKey(song.slug)}
                  onClose={() => setPlayingKey(null)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={() => demo.go("/dashboard/discover")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-transparent px-4 py-2.5 text-sm font-medium text-primary"
          >
            <Icon i="headphones" size={16} />
            {t("Écouter encore plus de musique")}
          </button>
        </div>
      </div>
    </div>
  );
}
