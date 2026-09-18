import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

// Ajouter ici uniquement les pages PUBLIQUES et indexables.
// Les routes privées (/dashboard, /admin, /setup, /api, auth) ne doivent jamais entrer dans le sitemap.
const publicRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
