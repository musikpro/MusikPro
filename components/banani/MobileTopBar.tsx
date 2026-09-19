"use client";
import { useCallback, useRef, useState } from "react";
import { useDemo } from "./DemoProvider";
const t = (text: string) => text;

import Icon from "./Icon";
import MobileMenuDrawer from "./MobileMenuDrawer";

export const displayName = "Mobile Top Bar";
export const shortDescription = "Top bar for mobile with logo, credits and notifications";

export default function MobileTopBar({ credits = 0 }) {
  const demo = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  return (
    <>
      <div className="musik-topbar flex items-center justify-between px-4 py-3 bg-background">
        <div className="flex items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            data-demo-ready
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center"
          >
            <Icon i="menu" size={20} className="text-foreground" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Icon i="music-2" size={14} className="text-primary-foreground" />
            </div>
            <span className="font-headings font-bold text-base text-foreground">{t("MusikPro")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-demo-ready
            aria-label="Voir mes chansons disponibles"
            onClick={() => demo.go("/dashboard/credits")}
            className="flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-xl"
          >
            <Icon i="crown" size={14} className="text-primary" />
            <span className="text-sm font-semibold text-primary">
              {credits} {t("chansons")}
            </span>
          </button>
          <button
            type="button"
            data-demo-ready
            onClick={() => demo.go("/dashboard/notifications")}
            aria-label="Notifications"
            className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center relative"
          >
            <Icon i="bell" size={18} className="text-foreground" />
            {demo.isDemo && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
          </button>
        </div>
      </div>
      <MobileMenuDrawer open={menuOpen} onClose={closeMenu} returnFocus={menuButtonRef} />
    </>
  );
}
