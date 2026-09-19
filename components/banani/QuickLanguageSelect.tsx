"use client";

import { useDemo } from "./DemoProvider";
import MusikSelect from "./MusikSelect";

export default function QuickLanguageSelect({ compact = false }: { compact?: boolean }) {
  const demo = useDemo();

  return (
    <MusikSelect
      className={`quick-language-select ${compact ? "is-compact" : ""}`}
      ariaLabel="Langue de l’interface"
      showOptionLabels={false}
      portal
      portalWidth={58}
      menuClassName="quick-language-menu"
      value={demo.choices.appLanguage}
      onChange={(value) => demo.choose("appLanguage", value)}
      options={[
        { value: "Français", label: "Français", display: "🇫🇷" },
        { value: "English", label: "English", display: "🇬🇧" },
      ]}
    />
  );
}
