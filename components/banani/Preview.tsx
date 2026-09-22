"use client";
import type { ReactNode } from "react";

import { useDemo } from "./DemoProvider";
import DesktopWorkspace from "./DesktopWorkspace";
export default function Preview({ children }: { children: ReactNode }) {
  const demo = useDemo();
  return (
    <div
      className="banani-copy musik-modern"
      data-theme={demo.choices.theme === "Sombre" ? "dark" : demo.choices.theme === "Auto" ? "auto" : "light"}
      suppressHydrationWarning
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
      <DesktopWorkspace>{children}</DesktopWorkspace>
    </div>
  );
}
