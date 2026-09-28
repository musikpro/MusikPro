"use client";

import { useState } from "react";
import Icon from "./Icon";

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  menuLabel: string;
  closeLabel: string;
};

// Real mobile nav menu for the public landing page: the hamburger button toggles a panel that
// unfolds from the top (the desktop nav links — Exemples/Comment ça marche/Tarifs/FAQ — have no
// mobile equivalent otherwise).
export default function MobileLandingMenu({ links, menuLabel, closeLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? closeLabel : menuLabel}
        className="landing-mobile-menu-btn p-2 border border-border rounded-md bg-background text-foreground flex items-center justify-center"
      >
        <Icon i={open ? "x" : "menu"} size={20} />
      </button>
      <div className={`landing-mobile-menu-panel ${open ? "landing-mobile-menu-open" : ""}`}>
        <div className="flex flex-col">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="landing-mobile-menu-link">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
