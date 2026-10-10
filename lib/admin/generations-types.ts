export type AdminGenerationRow = {
  id: string;
  songGroupId: string | null;
  userEmail: string | null;
  title: string | null;
  occasion: string | null;
  /** Full AI-directive prompt sent to Musicful — kept for the hover tooltip, never rendered directly. */
  style: string | null;
  styleLabel: string | null;
  versionLabel: string | null;
  status: string;
  provider: string;
  model: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  failureReason: string | null;
  /** Raw numeric `status` last reported by the provider (Musicful: 0 = finished, 4 observed on failed tasks). */
  providerStatus: number | null;
  /** Seconds from creation to the final state, or to now while still pending. */
  elapsedSeconds: number | null;
  createdAt: string;
};

export const GENERATION_STATUS_FILTERS = ["all", "completed", "processing", "failed"] as const;
export type GenerationStatusFilter = (typeof GENERATION_STATUS_FILTERS)[number];

export type GenerationsPage = {
  rows: AdminGenerationRow[];
  /** Nombre total de versions qui correspondent au filtre et à la recherche (toutes pages confondues). */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
