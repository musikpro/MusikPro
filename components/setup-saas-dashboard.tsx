import Link from "next/link";
import type { KitCheck, MobileAppReadiness } from "@/lib/setup/kit-dashboard";
import type { SecuritySaasReport } from "@/lib/security/security-saas-report";

const groups: KitCheck["group"][] = ["Base", "Services", "Paiements", "Qualité"];

function StatusDot({ status }: { status: KitCheck["status"] }) {
  return <span className={`kit-dot kit-dot-${status}`} aria-hidden="true" />;
}

export function SetupSaasDashboard({ checks, mobile, securityReport }: { checks: KitCheck[]; mobile: MobileAppReadiness; securityReport: SecuritySaasReport | null }) {
  const ok = checks.filter((c) => c.status === "ok").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const missing = checks.filter((c) => c.status === "missing").length;
  const score = checks.length ? Math.round(((ok + warnings) / checks.length) * 100) : 0;

  return (
    <main className="shell kit-home">
      <section className="card kit-hero">
        <div>
          <p className="kit-eyebrow">Africa SaaS Kit</p>
          <h1>État de préparation du kit</h1>
          <p className="muted">Aucune inscription n’est requise pour démarrer le starter. Configure les éléments rouges, puis demande <code>/setup-saas</code> à l’IA d’Antigravity pour être guidé pas à pas.</p>
        </div>
        <div className="kit-score" aria-label={`${score}% prêt`}>
          <strong>{score}%</strong>
          <span>{ok} prêts · {warnings} optionnels/à revoir · {missing} à configurer</span>
        </div>
      </section>

      <div className="kit-actions">
        <code>/setup-saas</code>
        <span className="muted">ou</span>
        <code>npm run setup-saas</code>
        <Link className="btn secondary" href="/setup">Actualiser les contrôles</Link>
      </div>

      <section className="card kit-next">
        <h2>Premier démarrage — installation guidée</h2>
        <p className="muted">Une commande simple vérifie Node/npm, l’intégrité du starter et l’état des dépendances sans écraser votre configuration. Le mode <code>first-run:install</code> lance aussi <code>npm install</code>, puis vous indique la prochaine étape.</p>
        <div className="kit-actions">
          <code>npm run first-run</code>
          <code>npm run first-run:install</code>
        </div>
      </section>

      <section className="card kit-next">
        <h2>Audit intégrité du kit</h2>
        <p className="muted">Contrôle transversal sans installation préalable : fichiers critiques, sécurité, Zod, fonctionnalités, routes, runtime, UI, SEO, Mobile WebView, scripts et JSON. <code>kit:verify</code> ajoute automatiquement les contrôles dynamiques dès que les dépendances sont installées.</p>
        <div className="kit-actions">
          <code>npm run kit:audit</code>
          <code>npm run kit:verify</code>
          <code>npm run doctor:kit</code>
        </div>
      </section>

      <section className="card kit-next">
        <h2>Staging Vercel — obligatoire avant Production</h2>
        <p className="muted">Le kit impose désormais le parcours <strong>Local → Preview/Staging → validation → Production</strong>. Les variables Vercel Preview doivent rester séparées des variables Production.</p>
        <div className="kit-actions">
          <code>npm run staging:check</code>
          <code>npm run staging:deploy</code>
          <code>npm run staging:test -- --url=https://...</code>
          <code>npm run staging:approve -- --url=https://...</code>
          <code>npm run deploy:production:check</code>
        </div>
        <p className="muted">Après toute modification du commit approuvé, refaites le staging. La commande <code>npm run deploy:production</code> refuse de lancer Vercel Production sans approbation valide.</p>
      </section>

      <section className="card kit-next">
        <h2>Backend status</h2>
        <p className="muted">Sondes JSON rapides pour confirmer que le serveur tourne et que ses dépendances sont prêtes.</p>
        <div className="kit-actions">
          <a className="btn secondary" href="/api/health" target="_blank" rel="noreferrer">/api/health — liveness</a>
          <a className="btn secondary" href="/api/readyz" target="_blank" rel="noreferrer">/api/readyz — readiness</a>
        </div>
      </section>

      {groups.map((group) => {
        const items = checks.filter((c) => c.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="kit-section">
            <h2>{group}</h2>
            <div className="kit-check-grid">
              {items.map((item) => (
                <article className={`kit-check ${item.status}`} key={item.id}>
                  <span className="kit-dot" aria-hidden="true" />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="card kit-security-audit" aria-labelledby="security-audit-title">
        <div className="kit-security-header">
          <div>
            <div className="kit-mobile-title-row">
              <h2 id="security-audit-title">Audit sécurité du SaaS</h2>
              <span className="badge">/security-saas</span>
            </div>
            <p className="muted">Scanne les fichiers du SaaS et vérifie les garde-fous du kit : secrets/.env.local, RLS, policies, validation serveur, Zod, authentification, vérification email, rate limiting, versions sensibles et npm audit.</p>
          </div>
          <div className="kit-security-score" aria-label={securityReport ? `Score sécurité ${securityReport.score}% rang ${securityReport.rank}` : "Audit sécurité non exécuté"}>
            <strong>{securityReport ? `${securityReport.score}%` : "—"}</strong>
            <span>{securityReport ? `Rang ${securityReport.rank}` : "audit non exécuté"}</span>
          </div>
        </div>

        <div className="kit-actions">
          <code>/security-saas</code>
          <span className="muted">ou</span>
          <code>npm run security-saas</code>
          <code>npm run security-saas:online</code>
        </div>

        {securityReport ? (
          <>
            <p className="muted">Dernier audit : {new Date(securityReport.generatedAt).toLocaleString("fr-FR")} · {securityReport.summary.scannedFiles} fichiers scannés · {securityReport.summary.pass} PASS · {securityReport.summary.warn} à vérifier · {securityReport.summary.fail} FAIL.</p>
            <div className="kit-check-grid">
              {securityReport.checks.map((item) => (
                <article className={`kit-check ${item.status === "pass" ? "ok" : item.status === "warn" ? "warning" : "missing"}`} key={item.id}>
                  <span className="kit-dot" aria-hidden="true" />
                  <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="notice">Aucun rapport généré. Lancez <code>/security-saas</code> dans Antigravity ou <code>npm run security-saas</code> dans le terminal pour obtenir le score et le rang.</div>
        )}
        <p className="muted">Pour confirmer que RLS et les policies sont réellement actives dans Neon/Postgres, utilisez le mode online avec la connexion base disponible localement. Les secrets ne sont jamais affichés.</p>
      </section>

      <section className="card kit-mobile-app" aria-labelledby="mobile-app-title">
        <div className="kit-mobile-header">
          <div>
            <div className="kit-mobile-title-row">
              <h2 id="mobile-app-title">Application Android & iPhone — WebView connectée au SaaS</h2>
              <span className="badge">Optionnel</span>
            </div>
            <p className="muted">L’application Capacitor ouvre directement le SaaS Next.js déjà déployé en HTTPS. Le backend, Neon, Resend, l’auth et les paiements restent en ligne côté serveur.</p>
          </div>
          <div className="kit-mobile-score">
            <strong>{mobile.progress}%</strong>
            <span>{mobile.enabled ? "pipeline activé" : "non activé"}</span>
          </div>
        </div>

        <div className="kit-mobile-architecture" role="note">
          <code>Android / iPhone → Capacitor WebView → {mobile.productionUrl || "https://monsaas.com"} → Next.js / API / Neon</code>
        </div>

        <div className="kit-mobile-columns">
          <div>
            <h3>Outils et services à prévoir</h3>
            <div className="kit-mobile-list">
              {mobile.services.map((service) => (
                <div className="kit-mobile-row" key={service.label}>
                  <StatusDot status={service.status} />
                  <div><strong>{service.label}</strong><p>{service.detail}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Étapes à garder en tête</h3>
            <ol className="kit-step-list">
              {mobile.steps.map((step) => <li className={step.done ? "done" : ""} key={step.label}>{step.label}</li>)}
            </ol>
          </div>
        </div>

        <div className="kit-mobile-assets">
          <h3>Images / assets à préparer</h3>
          <div className="kit-asset-grid">{mobile.assets.map((asset) => <span key={asset}>{asset}</span>)}</div>
          <p className="muted">Les dimensions exactes des stores doivent être revalidées au moment de la publication. Conserver les fichiers sources haute définition.</p>
        </div>

        <div className="kit-actions">
          <code>npm run mobile:app:configure</code>
          <code>npm run mobile:app:install</code>
          <code>npm run mobile:app:prepare</code>
          <code>npm run mobile:app:check</code>
        </div>
      </section>

      <section className="card kit-next">
        <h2>Ce que le starter embarque</h2>
        <ul>
          <li>Auth Better Auth, organisations, rôles et 2FA</li>
          <li>Neon PostgreSQL + Drizzle + migrations versionnées</li>
          <li>CRUD Clients post-Banani : modèle Prisma Client + routes <code>/api/clients/*</code> + Zod + RLS</li>
          <li>Admin, paiements optionnels, webhooks, cron et uploads Cloudinary optionnels</li>
          <li>Health/readiness, tests Vitest, ESLint, Prettier, typecheck, build et audit npm</li>
          <li>Computer Use / Browser Tools, responsive Web, Mobile App WebView optionnelle, skeleton loaders, SEO, Banani planner et handoff GitHub/Vercel</li>
        </ul>
      </section>

      <section className="card kit-next">
        <h2>Ordre recommandé</h2>
        <p className="muted">1. Lance <code>/setup-saas</code> → 2. vérifie Computer Use / Browser Tools → 3. configure Neon et les services de base → 4. importe Banani → attache le CRUD Clients si nécessaire → construis le SaaS → 5. teste/build → 6. prépare GitHub/Vercel → 7. valide obligatoirement le staging Vercel → 8. configure les services optionnels utiles → 9. finalise la production Web → 10. seulement ensuite, décide si la Phase 21 WebView Android/iPhone doit être activée.</p>
      </section>
    </main>
  );
}
