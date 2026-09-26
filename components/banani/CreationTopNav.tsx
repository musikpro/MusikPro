"use client";

import Icon from "./Icon";
import { useDemo } from "./DemoProvider";
import { translate as t } from "@/lib/i18n/translate";
import { recordCreationAbandoned } from "@/lib/analytics/funnel-actions";

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
      <button type="button" data-demo-ready="true" onClick={() => demo.go(backHref)} className="creation-back-button">
        <Icon i="arrow-left" size={17} /> {t("Retour")}
      </button>
      <button
        type="button"
        data-demo-ready="true"
        onClick={() => {
          if (!demo.isDemo) void recordCreationAbandoned(label);
          demo.go("/dashboard");
        }}
        className="creation-dashboard-button"
      >
        <Icon i="layout-dashboard" size={16} />
        {t("Tableau de bord")}
      </button>
      <span className="creation-step-label">{label ?? `${t("Étape")} ${current}/${total}`}</span>
    </div>
  );
}
