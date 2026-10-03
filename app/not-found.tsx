import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";

// Forced dynamic: without this, Next.js's built-in not-found boundary would be prerendered
// statically at build time and ship without the per-request CSP nonce (lib/security/headers.ts,
// set in proxy.ts), blocking its own hydration scripts under the hardened script-src.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Page introuvable"),
    description: t("Cette page n’existe pas ou a été déplacée."),
    path: "/404",
    noIndex: true,
  });
}

export default async function NotFound() {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="legal-shell">
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        <p className="legal-eyebrow">{t("Erreur 404")}</p>
        <h1>{t("Page introuvable")}</h1>
        <p className="legal-intro">{t("Cette page n’existe pas ou a été déplacée.")}</p>
      </header>
      <footer className="legal-footer">
        <Link href="/">{t("Retour à l’accueil")}</Link>
        <Link href="/login">{t("Connexion")}</Link>
      </footer>
    </main>
  );
}
