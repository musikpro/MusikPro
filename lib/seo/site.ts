export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Africa SaaS Kit",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    "Starter SaaS Next.js mobile-first adapté à l'Afrique.",
  url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  locale: process.env.NEXT_PUBLIC_APP_LOCALE || "fr_CI",
  language: process.env.NEXT_PUBLIC_APP_LANGUAGE || "fr",
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalized}`;
}
