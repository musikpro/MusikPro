/** Types partagés du journal d'audit (sans accès base : importables côté client comme serveur). */

export type AuditRow = {
  id: string;
  /** ISO 8601, en UTC. */
  createdAt: string;
  actorId: string | null;
  /** Renseignés tant que le compte de l'acteur existe encore. */
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  metadata: unknown;
};

export type AuditPage = {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
