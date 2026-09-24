import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

// Forced dynamic: without this, Next.js's built-in not-found boundary would be prerendered
// statically at build time and ship without the per-request CSP nonce (lib/security/headers.ts,
// set in proxy.ts), blocking its own hydration scripts under the hardened script-src.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Page introuvable",
  description: "Cette page n’existe pas ou a été déplacée.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="legal-shell">
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        <p className="legal-eyebrow">Erreur 404</p>
        <h1>Page introuvable</h1>
        <p className="legal-intro">Cette page n’existe pas ou a été déplacée.</p>
      </header>
      <footer className="legal-footer">
        <Link href="/">Retour à l’accueil</Link>
        <Link href="/login">Connexion</Link>
      </footer>
    </main>
  );
}
