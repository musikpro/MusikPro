import { apiFetch } from "@/lib/api/client";

export async function uploadCoverImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const result = await apiFetch<{ url: string }>("/api/uploads/images", { method: "POST", body: form });
  return result.url;
}
