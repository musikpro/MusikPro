import Link from "next/link";
import type { ReactNode } from "react";
import { formatLegalDate, splitEmailTemplate } from "@/lib/i18n/legal-locale";
import { translateForLocale, translateTemplateForLocale, type Locale } from "@/lib/i18n/translate";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalEmail({ text, email }: { text: string; email: string }) {
  const link = <a href={`mailto:${email}`}>{email}</a>;
  const parts = splitEmailTemplate(text);
  if (!parts) return <>{text} {link}</>;
  return <>{parts[0]}{link}{parts[1]}</>;
}

export function LegalPage({
  eyebrow,
  title,
  introduction,
  sections,
  locale,
  forcedFrench,
  path,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: LegalSection[];
  locale: Locale;
  forcedFrench: boolean;
  path: "/terms" | "/privacy";
}) {
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <main className="legal-shell" lang={forcedFrench ? "fr" : undefined}>
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        {locale !== "fr" ? (
          <p className="legal-notice" role="note">
            {t("Traduction automatique : en cas de divergence, la version française fait foi.")}{" "}
            <Link href={`${path}?lang=fr`}>{t("Lire la version française")}</Link>
          </p>
        ) : null}
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{introduction}</p>
        <p className="legal-updated">
          {translateTemplateForLocale("Dernière mise à jour : {date}", { date: formatLegalDate(locale) }, locale)}
        </p>
      </header>

      <article className="legal-card">
        {sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.content}</div>
          </section>
        ))}
      </article>

      <footer className="legal-footer">
        <Link href="/privacy">{t("Confidentialité")}</Link>
        <Link href="/terms">{t("Conditions d’utilisation")}</Link>
        <Link href="/login">{t("Connexion")}</Link>
      </footer>
    </main>
  );
}
