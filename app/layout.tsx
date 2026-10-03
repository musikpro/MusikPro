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
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { NonceProvider } from "@/components/security/nonce-provider";

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
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <NonceProvider nonce={nonce}>
          <ServiceWorkerRegister />
          <I18nBootstrap />
          <div className="app-content">{children}</div>
        </NonceProvider>
      </body>
    </html>
  );
}
