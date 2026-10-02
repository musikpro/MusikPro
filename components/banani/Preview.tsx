"use client";
import type { ReactNode } from "react";

import { useDemo } from "./DemoProvider";
import DesktopWorkspace from "./DesktopWorkspace";
import { translate as t } from "@/lib/i18n/translate";
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
              ? t("Mode démonstration — cette action sera disponible avec les fonctionnalités MusikPro.")
              : t("Cette action sera bientôt disponible dans votre espace MusikPro."),
          );
        }
      }}
    >
      {demo.isDemo && <span className="sr-only">{t("Maquette MusikPro avec données fictives.")}</span>}
      <DesktopWorkspace>{children}</DesktopWorkspace>
    </div>
  );
}
