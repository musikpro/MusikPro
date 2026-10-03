"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

import { resolveAdminTab, type AdminTabItem } from "@/lib/admin/tabs";

export type { AdminTabItem };

const AdminTabsContext = createContext<{ active: string } | null>(null);

function rememberTabInUrl(param: string, id: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(param, id);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // L'onglet reste actif localement ; seule la mémorisation dans l'URL est perdue.
  }
}

/**
 * Horizontal tab switcher — the single shared mechanism for horizontal tabs across the admin
 * dashboard (see CLAUDE.md). Any new set of admin boxes presented as horizontal tabs reuses this
 * component instead of a new implementation, so the card background, no-animation switching and
 * behavior stay consistent everywhere (already used by /admin/languages and /admin/ai-providers).
 *
 * Panels stay mounted (hidden via the `hidden` attribute, not unmounted) so any <form> wrapping
 * AdminTabs still submits fields from every tab, not just the visible one.
 */
export function AdminTabs({
  tabs,
  defaultTab,
  urlParam,
  ariaLabel,
  children,
}: {
  tabs: AdminTabItem[];
  defaultTab?: string;
  /**
   * Opt-in : mémorise l'onglet actif dans le paramètre d'URL indiqué (ex. `?tab=fields`), sans nouvelle
   * entrée d'historique, pour qu'un retour depuis une sous-page retombe sur le même onglet. La page lit
   * ce paramètre (voir `resolveAdminTab`) et le passe en `defaultTab`.
   */
  urlParam?: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const urlTab = useSearchParams().get(urlParam ?? "");
  const [chosen, setChosen] = useState<string | null>(null);
  // Choix de l'utilisateur > onglet de l'URL (retour arrière) > onglet par défaut.
  const active = chosen ?? resolveAdminTab(urlParam ? urlTab ?? undefined : undefined, tabs) ?? defaultTab ?? tabs[0]?.id ?? "";
  return (
    <AdminTabsContext.Provider value={{ active }}>
      <div className="admin-tabs">
        <div className="admin-tabs-list" role="tablist" aria-label={ariaLabel}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active}
              className={`admin-tabs-trigger${tab.id === active ? " is-active" : ""}`}
              onClick={() => {
                setChosen(tab.id);
                if (urlParam) rememberTabInUrl(urlParam, tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </AdminTabsContext.Provider>
  );
}

export function AdminTabPanel({ id, children }: { id: string; children: ReactNode }) {
  const context = useContext(AdminTabsContext);
  const isActive = context?.active === id;
  return (
    <div role="tabpanel" hidden={!isActive} className="admin-tabs-panel">
      {children}
    </div>
  );
}
