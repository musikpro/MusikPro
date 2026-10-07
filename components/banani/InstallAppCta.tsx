"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { useAppInstalled } from "@/lib/pwa/install-prompt";
import Icon from "./Icon";

export type InstallLinks = { googlePlayUrl: string | null; appStoreUrl: string | null };

const subscribeNever = () => () => {};

/**
 * Vrai dans l'application native (Capacitor), toujours : proposer « Installer l'application » à quelqu'un qui
 * l'utilise déjà n'a aucun sens, et les boutiques (Apple, Google) refusent qu'une application en promeuve une autre.
 * Sur le web — mobile ou ordinateur — la valeur reste fausse. Rendu serveur = faux : pas d'écart d'hydratation.
 */
export function useHideStoreButtons(): boolean {
  return useSyncExternalStore(subscribeNever, isNativeMobileApp, () => false);
}

type Variant = "card" | "compact";

const isExternal = (href: string) => /^https?:\/\//i.test(href);

function LinkOrButton({
  href,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return isExternal(href) ? (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
      {children}
    </a>
  ) : (
    <a className={className} href={href} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

/** Maquette de téléphone décorative : écran orange de la marque, note de musique et barres d'égaliseur. */
function PhoneMockup() {
  return (
    <div className="install-cta__phone" aria-hidden="true">
      <div className="install-cta__screen">
        <span className="install-cta__logo">
          <Icon i="music" size={22} />
        </span>
        <span className="install-cta__eq">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="install-cta__line" />
        <span className="install-cta__line install-cta__line--short" />
      </div>
    </div>
  );
}

/**
 * Invitation à installer l'application Android de MusikPro, avant la publication sur les boutiques officielles. Le
 * bouton mène à la page /download (téléchargement du fichier d'installation et étapes pas à pas) ; un lien Google Play
 * saisi par le propriétaire dans `/admin/mobile-apps` reste prioritaire. Masquée dans l'application native et une
 * fois l'application installée.
 */
export default function InstallAppCta({
  variant = "card",
  links,
  className = "",
}: {
  variant?: Variant;
  links: InstallLinks;
  className?: string;
}) {
  useI18nOverlay();
  const hiddenInApp = useHideStoreButtons();
  const installed = useAppInstalled();
  if (hiddenInApp || installed) return null;

  const href = links.googlePlayUrl ?? "/download#android";

  return (
    <section
      className={`install-cta install-cta--${variant} ${className}`}
      aria-label={t("Installer l'application MusikPro")}
    >
      <div className="install-cta__body">
        <p className="install-cta__eyebrow">{t("Application Android")}</p>
        <h2 className="install-cta__title">{t("Emportez MusikPro dans votre poche")}</h2>
        <p className="install-cta__text">
          {t("Créez vos chansons en quelques minutes, directement depuis l'écran d'accueil de votre téléphone.")}
        </p>
        <ul className="install-cta__perks">
          <li>
            <Icon i="zap" size={14} />
            {t("Installation en 30 secondes")}
          </li>
          <li>
            <Icon i="maximize" size={14} />
            {t("Plein écran, sans barre d'adresse")}
          </li>
          <li>
            <Icon i="gift" size={14} />
            {t("Gratuit, sans boutique d'applications")}
          </li>
        </ul>
        <div className="install-cta__actions">
          <LinkOrButton href={href} className="install-cta__primary">
            <Icon i="download" size={18} />
            {t("Installer maintenant")}
          </LinkOrButton>
        </div>
      </div>
      <PhoneMockup />
    </section>
  );
}
