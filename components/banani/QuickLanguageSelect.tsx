"use client";

import Icon from "./Icon";
import { useDemo } from "./DemoProvider";

export default function QuickLanguageSelect({ compact = false }: { compact?: boolean }) {
  const demo = useDemo();

  return (
    <label className={`quick-language-select ${compact ? "is-compact" : ""}`}>
      <span className="sr-only">Langue de l’interface</span>
      <select
        aria-label="Langue de l’interface"
        value={demo.choices.appLanguage}
        onChange={(event) => demo.choose("appLanguage", event.target.value)}
      >
        <option value="Français">🇫🇷</option>
        <option value="English">🇬🇧</option>
      </select>
      <Icon i="chevron-down" size={14} aria-hidden="true" />
    </label>
  );
}
