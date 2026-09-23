"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getNameInitials } from "@/lib/profile/name-initials";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/banani/Icon";
import { authClient } from "@/lib/auth/client";

type AdminShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
  };
  paymentBypassEnabled?: boolean;
};

type NavItem = {
  href?: string;
  icon: string;
  label: string;
};

const navigation: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Principal",
    items: [
      { href: "/admin", icon: "layout-dashboard", label: "Vue d’ensemble" },
      { href: "/admin/users", icon: "users", label: "Utilisateurs" },
      { href: "/admin/generations", icon: "music-2", label: "Générations" },
      { href: "/admin/library", icon: "library", label: "Bibliothèque" },
      { href: "/admin/contests", icon: "trophy", label: "Concours" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/admin/plans", icon: "coins", label: "Crédits & tarifs" },
      { href: "/admin/music-styles", icon: "sliders-horizontal", label: "Styles musicaux" },
      { href: "/admin/occasions", icon: "calendar-heart", label: "Occasions" },
      { href: "/admin/languages", icon: "languages", label: "Langues" },
      { href: "/admin/ai-providers", icon: "cpu", label: "Fournisseurs IA" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/payments", icon: "credit-card", label: "Paiements" },
      { href: "/admin/subscriptions", icon: "refresh-cw", label: "Abonnements" },
      { href: "/admin/credits", icon: "coins", label: "Soldes crédits" },
      { href: "/admin/analytics", icon: "chart-no-axes-column-increasing", label: "Analytics" },
      { href: "/admin/funnel", icon: "funnel", label: "Entonnoir" },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/admin/mobile-apps", icon: "smartphone", label: "Applications mobiles" },
      { href: "/admin/branding", icon: "palette", label: "Branding" },
      { href: "/admin/roles", icon: "shield-check", label: "Rôles & accès" },
      { href: "/admin/phone-prefixes", icon: "phone", label: "Préfixes téléphoniques" },
      { href: "/admin/payment-providers", icon: "route", label: "Passerelles" },
      { href: "/admin/integrations/google", icon: "search", label: "Google" },
      { href: "/admin/production-doctor", icon: "activity", label: "État production" },
    ],
  },
  {
    title: "Paramètres",
    items: [{ href: "/admin/settings", icon: "settings", label: "Paramètres généraux" }],
  },
];

const mobileTabs: NavItem[] = [
  { href: "/admin", icon: "layout-dashboard", label: "Tableau" },
  { href: "/admin/users", icon: "users", label: "Utilisateurs" },
  { href: "/admin/generations", icon: "music-2", label: "Générations" },
  { href: "/admin/payments", icon: "credit-card", label: "Paiements" },
];

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="admin-navigation" aria-label="Navigation propriétaire">
      {navigation.map((section) => (
        <section className="admin-nav-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="admin-nav-list">
            {section.items.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <span className="admin-nav-icon">
                    <Icon i={item.icon} size={17} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="admin-nav-pending" key={item.label} aria-disabled="true">
                  <span className="admin-nav-icon">
                    <Icon i={item.icon} size={17} />
                  </span>
                  <span>{item.label}</span>
                  <small>Bientôt</small>
                </span>
              ),
            )}
          </div>
        </section>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link className="admin-brand" href="/admin">
      <span className="admin-brand-mark">
        <Icon i="music-2" size={19} />
      </span>
      <span>
        <strong>MusikPro</strong>
        <small>Tableau propriétaire</small>
      </span>
    </Link>
  );
}

function BypassNotice() {
  return (
    <Link href="/admin/settings" className="admin-bypass-notice">
      <Icon i="flask-conical" size={15} />
      <span>Mode test actif — générations gratuites</span>
    </Link>
  );
}

function Account({ user }: { user: AdminShellProps["user"] }) {
  const initials = getNameInitials(user.name);
  return (
    <div className="admin-account">
      <span className="admin-account-avatar" aria-hidden="true">
        {initials}
      </span>
      <span>
        <strong>{user.name}</strong>
        <small>{user.email}</small>
      </span>
      <Icon i="shield-check" size={16} />
    </div>
  );
}

export default function AdminShell({ children, user, paymentBypassEnabled = false }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const sidebar = useRef<HTMLElement>(null);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    const element = sidebar.current;
    if (!element) return;
    const measure = () => {
      element.style.setProperty(
        "--admin-sidebar-top",
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

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <div className="admin-app" suppressHydrationWarning>
      <aside ref={sidebar} className="admin-sidebar">
        <Brand />
        {paymentBypassEnabled ? <BypassNotice /> : null}
        <AdminNav pathname={pathname} />
        <Account user={user} />
        <button
          type="button"
          className="admin-logout-action"
          aria-label="Se déconnecter du compte propriétaire"
          disabled={signingOut}
          onClick={() => void signOut()}
        >
          <Icon i="log-out" size={16} />
          {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-mobile-header">
          <Brand />
          <button
            type="button"
            aria-label="Ouvrir le menu propriétaire"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon i="menu" size={21} />
          </button>
        </header>

        <header className="admin-desktop-topbar">
          <div className="admin-topbar-context">
            <span className="admin-topbar-icon">
              <Icon i="command" size={17} />
            </span>
            <div>
              <strong>Centre de pilotage</strong>
              <small>Administration de la plateforme MusikPro</small>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-topbar-status">
              <span />
              Production active
            </span>
            <Link className="admin-topbar-client" href="/dashboard">
              <Icon i="arrow-up-right" size={16} />
              Espace client
            </Link>
            <span className="admin-topbar-avatar" aria-label={`Compte de ${user.name}`}>
              {getNameInitials(user.name)}
            </span>
          </div>
        </header>

        <div className="admin-content">{children}</div>

        <nav className="admin-mobile-tabs" aria-label="Navigation propriétaire mobile">
          {mobileTabs.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                prefetch={false}
              >
                <Icon i={item.icon} size={17} />
                <span>{item.label}</span>
              </Link>
            ) : (
              <span key={item.label} aria-disabled="true">
                <Icon i={item.icon} size={17} />
                <span>{item.label}</span>
              </span>
            ),
          )}
          <button type="button" aria-label="Ouvrir tous les menus" onClick={() => setDrawerOpen(true)}>
            <Icon i="menu" size={17} />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {drawerOpen ? (
        <div className="admin-drawer-layer" role="dialog" aria-modal="true" aria-label="Menu propriétaire">
          <button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Fermer le menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="admin-drawer">
            <div className="admin-drawer-head">
              <Brand />
              <button type="button" aria-label="Fermer le menu" onClick={() => setDrawerOpen(false)}>
                <Icon i="x" size={20} />
              </button>
            </div>
            {paymentBypassEnabled ? <BypassNotice /> : null}
            <Account user={user} />
            <AdminNav pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <Link className="admin-client-link" href="/dashboard" onClick={() => setDrawerOpen(false)}>
              <Icon i="arrow-left" size={17} />
              Espace client
            </Link>
            <button type="button" className="admin-logout-action" disabled={signingOut} onClick={() => void signOut()}>
              <Icon i="log-out" size={17} />
              {signingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
