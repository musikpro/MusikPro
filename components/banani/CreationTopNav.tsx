"use client";

import Icon from "./Icon";
import { useDemo } from "./DemoProvider";

export default function CreationTopNav({
  backHref,
  current,
  total = 7,
  label,
}: {
  backHref: string;
  current?: number;
  total?: number;
  label?: string;
}) {
  const demo = useDemo();
  return (
    <div className="creation-top-nav bg-background border-b border-border px-4 py-3">
      <div className="creation-top-nav-row">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go(backHref)}
          className="creation-back-button text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> Retour
        </button>
        <span className="text-sm font-medium text-muted-foreground">{label ?? `Étape ${current} sur ${total}`}</span>
      </div>
      <button
        type="button"
        data-demo-ready="true"
        onClick={() => demo.go("/dashboard")}
        className="creation-dashboard-button"
      >
        <Icon i="layout-dashboard" size={17} />
        Retour au tableau de bord
      </button>
    </div>
  );
}
