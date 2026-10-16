import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";
import { getMaintenanceStatus } from "@/lib/maintenance/settings";
import { buildMetadata } from "@/lib/seo/metadata";

// Forced dynamic: le nonce CSP (posé par proxy.ts) n'existe qu'à la requête, et l'état de maintenance est lu à chaque affichage.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Maintenance en cours"),
    description: t("MusikPro est momentanément indisponible pour maintenance. Revenez dans quelques instants."),
    path: "/maintenance",
    noIndex: true,
  });
}

/**
 * Page servie en 503 par proxy.ts à la place de toute page cliente tant que le mode maintenance est actif
 * (/admin/maintenance). Ouverte directement alors que le site est en ligne, elle renvoie vers l'accueil.
 */
export default async function MaintenancePage() {
  const status = await getMaintenanceStatus();
  if (!status.enabled) redirect("/");

  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="legal-shell">
      <header className="legal-hero" role="status">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        <p className="legal-eyebrow">{t("Maintenance")}</p>
        <h1>{t("Maintenance en cours")}</h1>
        <p className="legal-intro">
          {t("Nous améliorons MusikPro. Le service sera de nouveau disponible dans quelques instants.")}
        </p>
        {status.message ? <p className="legal-intro">{status.message}</p> : null}
      </header>
      <footer className="legal-footer">
        <Link href="/">{t("Réessayer")}</Link>
      </footer>
    </main>
  );
}
