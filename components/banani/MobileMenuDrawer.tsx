"use client";

import { useEffect, useRef, type RefObject } from "react";
import { demoDestination } from "@/lib/demo/navigation";
import Icon from "./Icon";
import QuickLanguageSelect from "./QuickLanguageSelect";
import UserAvatar from "./UserAvatar";
import { useDemo } from "./DemoProvider";
import { translate as t } from "@/lib/i18n/translate";

const drawerItems = [
  { icon: "house", label: "Accueil" },
  { icon: "user", label: "Mon Profil" },
  { icon: "music-2", label: "Mes chansons" },
  { icon: "heart", label: "Mes Favoris" },
  { icon: "coins", label: "Crédits" },
  { icon: "bell", label: "Notifications" },
  { icon: "settings", label: "Paramètres" },
  { icon: "help-circle", label: "Aide & FAQ" },
  { icon: "message-circle", label: "Support" },
] as const;

export default function MobileMenuDrawer({
  open,
  onClose,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const demo = useDemo();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocusButton = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      returnFocusButton?.focus();
    };
  }, [onClose, open, returnFocus]);

  if (!open) return null;

  const navigate = (label: string) => {
    onClose();
    demo.go(label === "Accueil" ? "/dashboard" : demoDestination(label));
  };

  return (
    <div className="mobile-menu-layer">
      <button type="button" className="mobile-menu-backdrop" aria-label="Fermer le menu" onClick={onClose} />
      <aside className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
        <div className="mobile-menu-drawer-head">
          <div className="mobile-menu-brand">
            <span>
              <Icon i="music-2" size={16} />
            </span>
            <strong id="mobile-menu-title">MusikPro</strong>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer le menu">
            <Icon i="x" size={20} />
          </button>
        </div>

        <nav className="mobile-menu-links" aria-label="Menu principal mobile">
          {drawerItems.map((item) => (
            <button key={item.label} type="button" onClick={() => navigate(item.label)}>
              <span className="mobile-menu-link-icon">
                <Icon i={item.icon} size={17} />
              </span>
              <span>{t(item.label)}</span>
              <Icon i="chevron-right" size={15} />
            </button>
          ))}
        </nav>

        <div className="mobile-menu-footer">
          <span>{t("Langue")}</span>
          <QuickLanguageSelect compact />
        </div>

        <button type="button" className="mobile-menu-profile" onClick={() => navigate("Mon Profil")}>
          <UserAvatar gender="male" ageGroup="25-35" heritage="African" index={1} className="w-12 h-12 rounded-xl" />
          <span>
            <strong>{demo.profile.name}</strong>
            <small>{demo.profile.email}</small>
          </span>
          <Icon i="chevron-right" size={17} />
        </button>
      </aside>
    </div>
  );
}
