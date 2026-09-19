"use client";
import type { ReactNode } from "react";

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
