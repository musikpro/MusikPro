"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type AdminTabItem = {
  id: string;
  label: string;
};

const AdminTabsContext = createContext<{ active: string } | null>(null);

/**
 * Horizontal tab switcher. Panels stay mounted (hidden via the `hidden` attribute, not
 * unmounted) so any <form> wrapping AdminTabs still submits fields from every tab, not just
 * the visible one.
 */
export function AdminTabs({
  tabs,
  defaultTab,
  ariaLabel,
  children,
}: {
  tabs: AdminTabItem[];
  defaultTab?: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");
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
              onClick={() => setActive(tab.id)}
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
