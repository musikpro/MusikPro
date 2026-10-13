"use client";

import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";

/** Barre du haut des écrans du visiteur invité : logo, retour éventuel et accès à la connexion. */
export default function GuestTopBar({ onBack }: { onBack?: () => void }) {
  return (
    <div className="musik-topbar flex items-center justify-between px-4 py-3 bg-background">
      <div className="flex items-center gap-1.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("Retour")}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Icon i="arrow-left" size={16} />
          </button>
        ) : null}
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
  );
}
