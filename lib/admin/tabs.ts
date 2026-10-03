export type AdminTabItem = {
  id: string;
  label: string;
};

/** Onglet demandé par l'URL s'il existe parmi `tabs`, sinon `undefined` (l'onglet par défaut s'applique). Utilisable côté serveur comme client. */
export function resolveAdminTab(value: string | string[] | undefined, tabs: readonly AdminTabItem[]): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return tabs.some((tab) => tab.id === candidate) ? candidate : undefined;
}
