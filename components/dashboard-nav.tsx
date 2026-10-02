import Link from "next/link";
import { headers } from "next/headers";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/request-locale";
import { translateForLocale } from "@/lib/i18n/translate";
export async function DashboardNav({ admin = false }: { admin?: boolean }) {
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <div className="sidebar">
      <Link className="btn secondary" href="/dashboard">
        {t("Vue générale")}
      </Link>
      <Link className="btn secondary" href="/dashboard/billing">
        {t("Abonnement")}
      </Link>
      <Link className="btn secondary" href="/dashboard/security">
        {t("Sécurité")}
      </Link>
      {admin && (
        <Link className="btn" href="/admin">
          {t("Administration")}
        </Link>
      )}
    </div>
  );
}
