export type WorkspaceSongVersionStatus = "queued" | "submitting" | "processing" | "completed" | "failed";

export type WorkspaceSongVersion = {
  label: string;
  duration: string;
  plays: number;
  liked: boolean;
  status?: WorkspaceSongVersionStatus;
  audioUrl?: string | null;
  failureReason?: string | null;
};

export type WorkspaceSong = {
  id: string | number;
  title: string;
  occasion: string;
  style: string;
  date: string;
  lyrics: string;
  status?: "processing" | "completed" | "failed";
  versions: WorkspaceSongVersion[];
};
