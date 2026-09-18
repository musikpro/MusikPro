import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/setup",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/two-factor",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
