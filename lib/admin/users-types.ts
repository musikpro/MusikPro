export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  verified: boolean;
  twoFactor: boolean;
  role: string;
  banned: boolean;
};

export const USER_STATE_FILTERS = ["all", "active", "inactive"] as const;
export type UserStateFilter = (typeof USER_STATE_FILTERS)[number];

export type UsersPage = {
  rows: AdminUserRow[];
  /** Nombre total de comptes qui correspondent au filtre et à la recherche (toutes pages confondues). */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
