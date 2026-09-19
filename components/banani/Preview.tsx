"use client";
import type { ReactNode } from "react";
import Link from "next/link";

import { useDemo } from "./DemoProvider";
import DesktopWorkspace from "./DesktopWorkspace";
export default function Preview({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const pathname = demo.pathname;
  return (
    <div
      className="banani-copy musik-modern"
      data-theme={demo.choices.theme === "Sombre" ? "dark" : demo.choices.theme === "Auto" ? "auto" : "light"}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        const control = target.closest("button,a");
        if (
          control &&
          !control.hasAttribute("data-demo-ready") &&
          !control.hasAttribute("href") &&
          control.tagName !== "BUTTON"
        ) {
          event.preventDefault();
          demo.notify(
            demo.isDemo
              ? "Mode démonstration — cette action sera disponible avec les fonctionnalités MusikPro."
              : "Cette action sera bientôt disponible dans votre espace MusikPro.",
          );
        }
      }}
    >
      {demo.isDemo && <span className="sr-only">Maquette MusikPro avec données fictives.</span>}
      <DesktopWorkspace>
        {children}
        {demo.isDemo && pathname !== "/dashboard" && (
          <details className="demo-page-directory">
            <summary>Explorer les écrans · démonstration</summary>
            <nav aria-label="Tous les écrans MusikPro">
              {[
                ["Accueil", ""],
                ["Menu", "/menu"],
                ["Bibliothèque", "/discover"],
                ["Mes chansons", "/songs"],
                ["Vue d’ensemble des chansons", "/songs/overview"],
                ["Lecteur", "/songs/player"],
                ["Favoris", "/favorites"],
                ["Notifications", "/notifications"],
                ["Créer une chanson", "/create"],
                ["Sélection du genre", "/create/genre"],
                ["Récit", "/create/story"],
                ["Style et ambiance", "/create/style"],
                ["Paramètres de création", "/create/parameters"],
                ["Génération des paroles", "/create/lyrics/generating"],
                ["Paroles", "/create/lyrics"],
                ["Modifier les paroles", "/create/lyrics/edit"],
                ["Résumé de création", "/create/confirm"],
                ["Vos informations", "/payment-preview"],
                ["Choix du pack", "/create/pack"],
                ["Profil", "/profile"],
                ["Variante du profil", "/profile/next"],
                ["Modifier le profil", "/profile/edit"],
                ["Paramètres", "/settings"],
                ["Réglages des notifications", "/settings/notifications"],
                ["Packs", "/credits"],
                ["Redirection simulée", "/payment-preview/chariow"],
                ["Confirmation simulée", "/payment-preview/confirmed"],
                ["Aide", "/help"],
                ["Support", "/support"],
              ].map(([label, suffix]) => (
                <Link
                  key={suffix}
                  href={demo.href(`/dashboard${suffix}`)}
                  prefetch={false}
                  data-demo-ready
                  aria-current={pathname === `/dashboard${suffix}` ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <p>Données fictives · aucune transaction réelle</p>
          </details>
        )}
        {pathname === "/dashboard/create/lyrics/generating" && (
          <div className="p-4">
            <button
              data-demo-ready
              type="button"
              className="w-full bg-primary text-white rounded-xl p-4 font-semibold"
              onClick={() => demo.go("/dashboard/create/lyrics")}
            >
              {demo.isDemo ? "Voir les paroles de démonstration" : "Voir les paroles"}
            </button>
          </div>
        )}
      </DesktopWorkspace>
    </div>
  );
}
