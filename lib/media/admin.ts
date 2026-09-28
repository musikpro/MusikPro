import "server-only";
import { isCloudinaryConfigured, listCloudinaryImages, type CloudinaryMediaAsset } from "@/lib/storage/cloudinary";

// Dedicated Cloudinary folder for owner-uploaded reusable images (song covers and anything else
// admin forms across the SaaS need to associate an image with) — kept separate from the
// per-user `users/{id}` folder used by the client-facing upload route.
export const MEDIA_LIBRARY_FOLDER = "media-library";

export type MediaAsset = CloudinaryMediaAsset;

export async function listMediaAssets(): Promise<MediaAsset[]> {
  if (!isCloudinaryConfigured()) return [];
  try {
    return await listCloudinaryImages(MEDIA_LIBRARY_FOLDER);
  } catch {
    return [];
  }
}
