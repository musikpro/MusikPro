import { apiFetch } from "@/lib/api/client";
import { compressImage } from "@/lib/demo/image-resize";

export async function uploadCoverImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("file", compressed);
  const result = await apiFetch<{ url: string }>("/api/uploads/images", { method: "POST", body: form });
  return result.url;
}
