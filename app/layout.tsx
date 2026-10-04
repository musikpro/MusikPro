import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { I18nBootstrap } from "@/components/i18n-bootstrap";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { NonceProvider } from "@/components/security/nonce-provider";
import ExclusiveAudioPlayback from "@/components/banani/ExclusiveAudioPlayback";
import { isExclusivePlaybackEnabled } from "@/lib/settings/playback";

export const metadata: Metadata = {
  ...buildMetadata(),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/musikpro-favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1020",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Langue de <html lang> seulement : le layout racine n'affiche aucun texte traduit côté serveur ;
  // chaque composant serveur qui traduit appelle lui-même primeOverlay (pages, layouts, métadonnées, e-mails).
  const locale = await resolvePageLocale();
  const exclusivePlayback = await isExclusivePlaybackEnabled();
  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NonceProvider nonce={nonce}>
          <ServiceWorkerRegister />
          <I18nBootstrap />
          <ExclusiveAudioPlayback enabled={exclusivePlayback} />
          <div className="app-content">{children}</div>
        </NonceProvider>
      </body>
    </html>
  );
}
