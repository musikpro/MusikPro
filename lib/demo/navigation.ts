const destinations: Record<string, string> = {
  Accueil: "/dashboard",
  Découvrir: "/dashboard/discover",
  Bibliothèque: "/dashboard/discover",
  Téléchargements: "/dashboard/songs/overview",
  Créer: "/dashboard/create",
  "Mes chansons": "/dashboard/songs",
  "Mes paroles": "/dashboard/lyrics",
  "Mon Profil": "/dashboard/profile",
  Profil: "/dashboard/profile",
  Favoris: "/dashboard/favorites",
  "Mes Favoris": "/dashboard/favorites",
  Notifications: "/dashboard/notifications",
  Packs: "/dashboard/credits",
  Crédits: "/dashboard/credits",
  Paiement: "/dashboard/payment-preview",
  Paiements: "/dashboard/payment-preview",
  Paramètres: "/dashboard/settings",
  "Aide & FAQ": "/dashboard/help",
  Support: "/dashboard/support",
};
export function demoDestination(label: string) {
  return destinations[label] ?? "/dashboard/menu";
}
