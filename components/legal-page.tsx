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
  // Alias nommé `translateTemplate` : le scanner i18n ne reconnaît pas `translateTemplateForLocale(`.
  const translateTemplate = (text: string, params: Record<string, string | number>) =>
    translateTemplateForLocale(text, params, locale);
  const suffix = forcedFrench ? "?lang=fr" : "";
  return (
    <main className="legal-shell" lang={forcedFrench ? "fr" : undefined}>
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        {locale !== "fr" ? (
          <p className="legal-notice" role="note">
            {t("Traduction automatique : en cas de divergence, la version française fait foi.")}{" "}
            <Link href={`${path}?lang=fr`}>{t("Consulter la version française")}</Link>
          </p>
        ) : null}
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{introduction}</p>
        <p className="legal-updated">
          {translateTemplate("Dernière mise à jour : {date}", { date: formatLegalDate(locale) })}
        </p>
      </header>

      {sections.length > 3 ? (
        <nav className="legal-toc" aria-label={t("Sommaire")}>
          <p className="legal-toc-title">{t("Sommaire")}</p>
          <ol>
            {sections.map((section, index) => (
              <li key={index}>
                <a href={`#section-${index + 1}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <article className="legal-card">
        {sections.map((section, index) => (
          <section className="legal-section" id={`section-${index + 1}`} key={index}>
            <h2>
              {index + 1}. {section.title}
            </h2>
            <div>{section.content}</div>
          </section>
        ))}
      </article>

      <footer className="legal-footer">
        <Link href={`/privacy${suffix}`}>{t("Confidentialité")}</Link>
        <Link href={`/terms${suffix}`}>{t("Conditions d’utilisation")}</Link>
        <Link href="/login">{t("Connexion")}</Link>
      </footer>
    </main>
  );
}
