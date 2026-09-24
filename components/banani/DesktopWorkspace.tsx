"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useDemo } from "./DemoProvider";
import DesktopSidebar from "./DesktopSidebar";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";
import MobileBottomNav from "./MobileBottomNav";
import WorkspaceBalanceCard from "./WorkspaceBalanceCard";
import { translate as t } from "@/lib/i18n/translate";

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
    creation: t("Studio de création"),
    player: t("Lecteur musical"),
    songs: t("Vos créations"),
    discover: t("Bibliothèque musicale"),
    settings: t("Préférences"),
    profile: t("Votre espace personnel"),
    menu: t("Votre espace"),
    form: t("Votre espace MusikPro"),
  }[section];
  return (
    <div className="workspace-layout" data-section={section}>
      <DesktopSidebar />
      <div className="workspace-body">
        <header className="workspace-header">
          <div>
            <p>{label}</p>
            <small>{t("Chaque histoire mérite sa chanson")}</small>
          </div>
          <div className="workspace-header-actions">
            <Link href={demo.href("/dashboard/notifications")} aria-label={t("Notifications")}>
              <Icon i="bell" size={20} />
            </Link>
            <Link href={demo.href("/dashboard/profile")} aria-label={t("Mon profil")}>
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
          <aside
            className="workspace-context"
            aria-label={creation ? t("Résumé de création") : t("Raccourcis et activité")}
          >
            <WorkspaceBalanceCard />
            {creation ? (
              <section className="workspace-context-card">
                <h2>
                  <Icon i="sliders-horizontal" size={18} />
                  {t("Votre chanson")}
                </h2>
                <dl>
                  {[
                    [t("Occasion"), demo.displayName(demo.occasions, demo.choices.occasion)],
                    [t("Style musical"), demo.displayName(demo.musicStyles, demo.choices.genre)],
                    [t("Ambiance"), t(demo.choices.mood)],
                    [t("Langue"), t(demo.choices.language)],
                    [t("Voix"), t(demo.choices.voice)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="workspace-hint">{t("Vos choix restent disponibles pendant les étapes de création.")}</p>
              </section>
            ) : (
              <section className="workspace-context-card">
                <h2>
                  <Icon i="music-2" size={18} />
                  {t("Dernières créations")}
                </h2>
                <div className="workspace-recent-list">
                  {demo.songs.length === 0 && <p className="workspace-hint">{t("Aucune création pour le moment.")}</p>}
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
                  {t("Toutes mes chansons")}
                  <Icon i="arrow-right" size={14} />
                </Link>
              </section>
            )}
            <section className="workspace-context-card workspace-help-card">
              <Icon i={creation ? "headphones" : "life-buoy"} size={25} />
              <h2>{creation ? t("Créez à votre rythme") : t("Un coup de main ?")}</h2>
              <p>
                {creation
                  ? t("Racontez un souvenir précis pour donner plus de personnalité à votre chanson.")
                  : t("Retrouvez nos conseils et les réponses à vos questions.")}
              </p>
              <Link href={demo.href("/dashboard/help")} className="workspace-text-link">
                {t("Consulter l’aide")}
                <Icon i="arrow-right" size={14} />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
