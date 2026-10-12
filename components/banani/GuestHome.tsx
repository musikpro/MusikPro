"use client";

import { useDemo } from "./DemoProvider";
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
  const steps = [
    t("Raconte votre histoire et choisis le style"),
    t("Connecte-toi gratuitement quand tu es prêt"),
    t("Reçois ta chanson personnalisée"),
  ];
  return (
    <div className="bg-background min-h-screen pb-10">
      <div className="musik-topbar flex items-center justify-between px-4 py-3 bg-background">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Icon i="music-2" size={14} className="text-primary-foreground" />
          </div>
          <span className="font-headings font-bold text-base text-foreground">{t("MusikPro")}</span>
        </div>
        <a
          href="/login"
          className="flex items-center gap-1.5 bg-secondary text-primary font-semibold text-sm px-3 py-2 rounded-xl"
        >
          <Icon i="log-in" size={15} />
          {t("Se connecter")}
        </a>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="dashboard-greeting px-4 pt-4 pb-3">
          <div>
            <h1 className="font-headings font-bold text-2xl text-foreground">{t("Crée ta chanson personnalisée")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Commence sans compte : tu te connectes seulement quand tes paroles sont prêtes à être générées.")}
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

        <ol className="px-4 mb-6 flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-full bg-secondary text-primary font-bold text-sm flex items-center justify-center flex-shrink-0"
              >
                {index + 1}
              </span>
              <span className="text-sm text-foreground">{step}</span>
            </li>
          ))}
        </ol>

        {trending.length ? (
          <section className="px-4" aria-labelledby="guest-trending-title">
            <h2 id="guest-trending-title" className="font-headings font-bold text-lg text-foreground mb-3">
              {t("Tendances")}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {trending.slice(0, 4).map((song) => (
                <div key={song.slug} className="rounded-xl overflow-hidden relative">
                  {song.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- couverture déjà optimisée côté stockage
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="musik-trend-brand-cover w-full aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icon.svg" alt="" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                    <p className="text-white font-bold text-xs">{song.displayTitle}</p>
                    <p className="text-white/70 text-xs flex items-center gap-1">
                      <Icon i="headphones" size={10} />
                      {formatPlays(song.plays)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
