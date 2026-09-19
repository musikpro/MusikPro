import Link from "next/link";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  introduction,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-shell">
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{introduction}</p>
        <p className="legal-updated">Dernière mise à jour : 19 septembre 2026</p>
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
        <Link href="/privacy">Confidentialité</Link>
        <Link href="/terms">Conditions d’utilisation</Link>
        <Link href="/login">Connexion</Link>
      </footer>
    </main>
  );
}
