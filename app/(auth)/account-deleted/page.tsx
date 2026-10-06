import Link from "next/link";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";

// Même raison que les autres pages : le nonce CSP n'existe qu'au moment de la requête.
export const dynamic = "force-dynamic";

/** Page d'arrivée après le lien de confirmation de suppression de compte (indexation interdite par le layout (auth)). */
export default async function AccountDeletedPage() {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-form">
          <h1>{t("Ton compte a été supprimé")}</h1>
          <p className="auth-subtitle">
            {t("Tes chansons et tes informations personnelles ont été effacées. Merci d’avoir utilisé MusikPro.")}
          </p>
          <Link className="auth-submit" href="/">
            {t("Retour à l’accueil")}
          </Link>
        </div>
      </div>
    </div>
  );
}
