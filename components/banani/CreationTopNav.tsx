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
      <button
        type="button"
        data-demo-ready="true"
        onClick={() => demo.go(backHref)}
        className="creation-back-button"
      >
        <Icon i="arrow-left" size={17} /> Retour
      </button>
      <button
        type="button"
        data-demo-ready="true"
        onClick={() => demo.go("/dashboard")}
        className="creation-dashboard-button"
      >
        <Icon i="layout-dashboard" size={16} />
        Tableau de bord
      </button>
      <span className="creation-step-label">
        {label ?? `Étape ${current}/${total}`}
      </span>
    </div>
  );
}
