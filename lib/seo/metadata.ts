import type { Metadata } from "next";
import { translateForLocale, type Locale } from "@/lib/i18n/translate";
import { absoluteUrl, siteConfig } from "./site";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  image = "/opengraph-image",
  noIndex = false,
}: SeoInput = {}): Metadata {
  const canonical = absoluteUrl(path);
  const pageTitle = title || siteConfig.name;
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const socialImage = absoluteUrl(image);

  return {
    metadataBase: new URL(siteConfig.url),
    title: pageTitle,
    description,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: canonical,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      images: [{ url: socialImage, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [socialImage],
    },
  };
}

export const privatePageMetadata = buildMetadata({
  title: "Espace privé",
  description: "Espace privé du SaaS.",
  noIndex: true,
});

/** Version traduisible de privatePageMetadata (locale résolue par l'appelant, après primeOverlay). */
export function getPrivatePageMetadata(locale: Locale): Metadata {
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Espace privé"),
    description: t("Espace privé du SaaS."),
    noIndex: true,
  });
}
