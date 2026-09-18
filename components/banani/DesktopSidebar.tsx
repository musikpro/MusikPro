"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

const groups = [
  [
    ["home", "Accueil", ""],
    ["compass", "Découvrir", "/discover"],
    ["plus-circle", "Créer", "/create"],
    ["music", "Mes chansons", "/songs"],
    ["heart", "Favoris", "/favorites"],
  ],
  [
    ["zap", "Crédits", "/credits"],
    ["receipt", "Paiements", "/payment-preview"],
    ["bell", "Notifications", "/notifications"],
  ],
  [
    ["user", "Mon profil", "/profile"],
    ["settings", "Paramètres", "/settings"],
    ["help-circle", "Aide & FAQ", "/help"],
    ["mail", "Support", "/support"],
  ],
];
export default function DesktopSidebar() {
  const pathname = usePathname();
  const demo = useDemo();
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = sidebar.current;
    if (!element) return;
    const measure = () => {
      // A tall menu travels with the document until its bottom reaches the viewport.
      // A short menu stays at the top. Native sticky positioning handles scrolling.
      element.style.setProperty(
        "--sidebar-sticky-top",
        `${Math.min(0, window.innerHeight - element.getBoundingClientRect().height)}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <aside
      ref={sidebar}
      className="workspace-sidebar"
      aria-label="Navigation bureau"
    >
      <Link href="/dashboard" className="workspace-brand">
        <span>
          <Icon i="music-2" size={19} />
        </span>
        MusikPro
      </Link>
      <nav aria-label="Navigation principale">
        {groups.map((group, index) => (
          <div className="workspace-nav-group" key={index}>
            {group.map(([icon, label, suffix]) => {
              const href = `/dashboard${suffix}`;
              const active = suffix
                ? pathname === href || pathname.startsWith(href + "/")
                : pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon i={icon} size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <Link href="/dashboard/profile" className="workspace-account">
        <UserAvatar
          gender="male"
          ageGroup="25-35"
          heritage="African"
          index={1}
          className="w-9 h-9 rounded-full"
        />
        <span>
          <strong>{demo.profile.name}</strong>
          <small>Compte de démonstration</small>
        </span>
        <Icon i="chevron-right" size={15} />
      </Link>
    </aside>
  );
}
