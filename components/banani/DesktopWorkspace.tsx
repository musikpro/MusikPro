"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useDemo } from "./DemoProvider";
import DesktopSidebar from "./DesktopSidebar";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";
import MobileBottomNav from "./MobileBottomNav";

export default function DesktopWorkspace({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const pathname = demo.pathname;
  if (pathname === "/dashboard") return children;
  const focusedPaymentFlow = pathname.startsWith("/dashboard/payment-preview");
  const creation = pathname.startsWith("/dashboard/create") || focusedPaymentFlow;
  const hasImportedNavigation = [
    "/dashboard/menu",
    "/dashboard/discover",
    "/dashboard/songs",
    "/dashboard/songs/overview",
    "/dashboard/songs/player",
    "/dashboard/favorites",
    "/dashboard/credits",
    "/dashboard/settings",
    "/dashboard/profile",
    "/dashboard/profile/next",
  ].includes(pathname);
  const section = creation
    ? "creation"
    : pathname.includes("/songs/player")
      ? "player"
      : pathname.includes("/songs") || pathname.includes("/favorites")
        ? "songs"
        : pathname.includes("/discover")
          ? "discover"
          : pathname.includes("/settings")
            ? "settings"
            : pathname.includes("/profile")
              ? "profile"
              : pathname.includes("/menu")
                ? "menu"
                : "form";
  const label = {
    creation: "Studio de création",
    player: "Lecteur musical",
    songs: "Vos créations",
    discover: "Bibliothèque musicale",
    settings: "Préférences",
    profile: "Votre espace personnel",
    menu: "Votre espace",
    form: "Votre espace MusikPro",
  }[section];
  return (
    <div className="workspace-layout" data-section={section}>
      <DesktopSidebar />
      <div className="workspace-body">
        <header className="workspace-header">
          <div>
            <p>{label}</p>
            <small>Chaque histoire mérite sa chanson</small>
          </div>
          <div className="workspace-header-actions">
            <Link href={demo.href("/dashboard/notifications")} aria-label="Notifications">
              <Icon i="bell" size={20} />
            </Link>
            <Link href={demo.href("/dashboard/profile")} aria-label="Mon profil">
              <UserAvatar
                gender="male"
                ageGroup="25-35"
                heritage="African"
                index={1}
                className="w-9 h-9 rounded-full"
              />
            </Link>
          </div>
        </header>
        <div className="workspace-columns">
          <main className="workspace-content" id="workspace-content">
            {children}
            {!hasImportedNavigation && !creation && !focusedPaymentFlow && (
              <div className="workspace-mobile-nav">
                <MobileBottomNav activeTab="" />
              </div>
            )}
          </main>
          <aside className="workspace-context" aria-label={creation ? "Résumé de création" : "Raccourcis et activité"}>
            <section className="workspace-context-card workspace-credit-card">
              <div className="workspace-credit-heading">
                <span aria-hidden="true">
                  <Icon i="music-2" size={18} />
                </span>
                <div>
                  <small>Votre solde</small>
                  <h2>Chansons disponibles</h2>
                </div>
              </div>
              <div className="workspace-credit-balance">
                <strong className="workspace-credit-number">{demo.balance}</strong>
                <span>chansons restantes</span>
              </div>
              <p className="workspace-credit-demo">
                <Icon i="check" size={14} />
                {demo.balance > 0
                  ? `Prêt pour ${demo.balance} nouvelle${demo.balance > 1 ? "s" : ""} création${demo.balance > 1 ? "s" : ""}${demo.isDemo ? " · démonstration" : ""}`
                  : "Choisissez un pack pour créer votre première chanson"}
              </p>
              <Link href={demo.href("/dashboard/credits")} className="workspace-primary-link">
                Voir les packs
                <Icon i="arrow-right" size={16} />
              </Link>
            </section>
            {creation ? (
              <section className="workspace-context-card">
                <h2>
                  <Icon i="sliders-horizontal" size={18} />
                  Votre chanson
                </h2>
                <dl>
                  {[
                    ["Occasion", demo.choices.occasion],
                    ["Style", demo.choices.genre],
                    ["Ambiance", demo.choices.mood],
                    ["Langue", demo.choices.language],
                    ["Voix", demo.choices.voice],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="workspace-hint">Vos choix restent disponibles pendant les étapes de création.</p>
              </section>
            ) : (
              <section className="workspace-context-card">
                <h2>
                  <Icon i="music-2" size={18} />
                  Dernières créations
                </h2>
                <div className="workspace-recent-list">
                  {demo.songs.length === 0 && <p className="workspace-hint">Aucune création pour le moment.</p>}
                  {demo.songs.slice(0, 3).map((song) => (
                    <button key={song.title} type="button" data-demo-ready onClick={() => demo.openSong(song.title)}>
                      <span className="workspace-song-icon">
                        <Icon i="music-2" size={16} />
                      </span>
                      <span>
                        <strong>{song.title}</strong>
                        <small>{song.style}</small>
                      </span>
                      <Icon i="play" size={15} />
                    </button>
                  ))}
                </div>
                <Link href={demo.href("/dashboard/songs")} className="workspace-text-link">
                  Toutes mes chansons
                  <Icon i="arrow-right" size={14} />
                </Link>
              </section>
            )}
            <section className="workspace-context-card workspace-help-card">
              <Icon i={creation ? "headphones" : "life-buoy"} size={25} />
              <h2>{creation ? "Créez à votre rythme" : "Un coup de main ?"}</h2>
              <p>
                {creation
                  ? "Racontez un souvenir précis pour donner plus de personnalité à votre chanson."
                  : "Retrouvez nos conseils et les réponses à vos questions."}
              </p>
              <Link href={demo.href("/dashboard/help")} className="workspace-text-link">
                Consulter l’aide
                <Icon i="arrow-right" size={14} />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
