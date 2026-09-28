"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLandingLanguage } from "@/lib/languages/landing-language-action";
import Icon from "./Icon";

export type LandingLanguageOption = { code: string; flag: string; nativeName: string };

type Props = {
  languages: LandingLanguageOption[];
  currentFlag: string;
  currentLabel: string;
  compact?: boolean;
};

// Real, server-verified language switcher for the public landing page: reuses the same active
// language catalog as the rest of the SaaS (lib/languages/server.ts) and persists the choice via
// a cookie read server-side in app/page.tsx — no separate/fake language list. Selecting a
// language shows that choice immediately (optimistic flag/label) and refreshes the server-
// rendered content in place via router.refresh(), instead of a <form action> + redirect() full
// navigation, which re-downloads every asset and visibly lags before the new language appears.
export default function LandingLanguageSwitcher({ languages, currentFlag, currentLabel, compact = false }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<LandingLanguageOption | null>(null);

  // Once the real props reflect the change (after router.refresh() re-renders app/page.tsx with
  // the new cookie), the optimistic override is no longer needed — clearing it avoids showing a
  // stale flag if the server ever resolves to something else (e.g. an inactive/removed language).
  // Adjusted during render (React's recommended pattern for resetting state when props change)
  // rather than in an effect, which would cost an extra render pass after every server refresh.
  const [seenLabel, setSeenLabel] = useState(currentLabel);
  if (currentLabel !== seenLabel) {
    setSeenLabel(currentLabel);
    setOptimistic(null);
  }

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (details && details.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectLanguage = (language: LandingLanguageOption) => {
    if (detailsRef.current) detailsRef.current.open = false;
    setOptimistic(language);
    startTransition(async () => {
      await setLandingLanguage(language.code);
      router.refresh();
    });
  };

  if (languages.length <= 1) {
    return (
      <span className={`flex items-center gap-1.5 border border-border rounded-md text-foreground bg-background ${compact ? "px-3 py-2 text-xs" : "px-3 py-2 text-sm font-semibold"}`}>
        <span>{currentFlag}</span>
        <span>{currentLabel}</span>
      </span>
    );
  }

  const displayFlag = optimistic?.flag ?? currentFlag;
  const displayLabel = optimistic ? optimistic.code.toUpperCase() : currentLabel;

  return (
    <details ref={detailsRef} className="landing-lang-select relative">
      <summary
        className={`landing-chip-hover flex items-center gap-1.5 border border-border rounded-md text-foreground bg-background cursor-pointer select-none ${isPending ? "opacity-60" : ""} ${compact ? "px-3 py-2 text-xs" : "px-3 py-2 text-sm font-semibold"}`}
      >
        <span>{displayFlag}</span>
        <span>{displayLabel}</span>
        <Icon i="chevron-down" size={compact ? 12 : 14} className="landing-lang-chevron text-muted-foreground" />
      </summary>
      <div className="landing-lang-panel absolute right-0 mt-2 min-w-[5rem] bg-card border border-border rounded-md overflow-hidden z-50">
        {languages.map((language) => (
          <button
            key={language.code}
            type="button"
            onClick={() => selectLanguage(language)}
            className="landing-lang-option w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground"
          >
            <span>{language.flag}</span>
            <span>{language.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
