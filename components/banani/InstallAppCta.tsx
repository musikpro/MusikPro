"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isNativeMobileApp } from "@/lib/mobile/native-runtime";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { InstallGuide, useInstallAction } from "@/components/pwa/install-guide";
import { useAppInstalled, useDevicePlatform } from "@/lib/pwa/install-prompt";
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

type Variant = "card" | "compact" | "banner" | "strip";

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
 * Invitation à installer l'application MusikPro (remplace les logos Google Play / App Store, l'application n'étant
 * pas dans ces boutiques). Sur Chrome Android, le bouton ouvre directement la fenêtre d'installation du navigateur ;
 * sinon il mène à la page d'installation de la plateforme détectée. Un lien de boutique saisi par le propriétaire
 * reste prioritaire (il arrive ici dans `links`). Masquée dans l'application native et une fois l'application installée.
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
  const platform = useDevicePlatform();
  const { install, guideOpen, closeGuide } = useInstallAction();
  if (hiddenInApp || installed) return null;

  const androidHref = links.googlePlayUrl ?? "/download#android";
  const iosHref = links.appStoreUrl ?? "/download#iphone";
  const primaryHref = platform === "ios" ? iosHref : androidHref;
  // Lien de boutique saisi par le propriétaire : il garde la priorité sur l'installation directe.
  const storeHref = isExternal(primaryHref) ? primaryHref : null;
  const primaryLabel = t("Installer maintenant");

  const primary = storeHref ? (
    <LinkOrButton href={storeHref} className="install-cta__primary">
      <Icon i="download" size={18} />
      {primaryLabel}
    </LinkOrButton>
  ) : (
    <button type="button" className="install-cta__primary" onClick={() => void install()}>
      <Icon i="download" size={18} />
      {primaryLabel}
    </button>
  );

  if (variant === "strip") {
    const inner = (
      <>
        <span className="install-cta__strip-icon">
          <Icon i="smartphone" size={18} />
        </span>
        <span className="install-cta__strip-text">
          <strong>{t("Installer l'application")}</strong>
          <small>{t("Gratuit, en 30 secondes")}</small>
        </span>
        <Icon i="chevron-right" size={16} />
      </>
    );
    return storeHref ? (
      <LinkOrButton href={storeHref} className={`install-cta install-cta--strip ${className}`}>
        {inner}
      </LinkOrButton>
    ) : (
      <>
        <button type="button" className={`install-cta install-cta--strip ${className}`} onClick={() => void install()}>
          {inner}
        </button>
      </>
    );
  }

  return (
    <section
      className={`install-cta install-cta--${variant} ${className}`}
      aria-label={t("Installer l'application MusikPro")}
    >
      <div className="install-cta__body">
        <p className="install-cta__eyebrow">{t("Application mobile")}</p>
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
          {primary}
          <LinkOrButton href={platform === "ios" ? androidHref : iosHref} className="install-cta__chip">
            <Icon i="smartphone" size={15} />
            {platform === "ios" ? t("Android") : t("iPhone")}
          </LinkOrButton>
        </div>
      </div>
      <PhoneMockup />
      <InstallGuide open={guideOpen} onClose={closeGuide} platform={platform} />
    </section>
  );
}
