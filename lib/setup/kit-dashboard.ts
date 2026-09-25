import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import providersCatalog from "@/config/providers.json";

export type KitStatus = "ok" | "missing" | "warning";

export type MobileAppReadiness = {
  enabled: boolean;
  strategy: "webview-hosted";
  progress: number;
  productionUrl: string | null;
  platforms: string[];
  services: Array<{ label: string; status: KitStatus; detail: string }>;
  steps: Array<{ label: string; done: boolean }>;
  assets: string[];
};

export type KitCheck = {
  id: string;
  label: string;
  status: KitStatus;
  detail: string;
  group: "Base" | "Services" | "Paiements" | "Sécurité" | "Performance" | "Qualité";
  optional?: boolean;
};

type KitConfig = {
  email?: string;
  emailPasswordEnabled?: boolean;
  providers?: string[];
  googleAuth?: boolean;
  searchConsole?: boolean;
  cloudinaryEnabled?: boolean;
  banani?: boolean;
  securityLevel?: string;
  mobileAppEnabled?: boolean;
  mobileApp?: Record<string, unknown>;
};

function exists(rel: string) {
  return fs.existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), rel));
}

function readConfig(): KitConfig | null {
  const file = path.join(process.cwd(), "africa-saas.config.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as KitConfig;
  } catch {
    return null;
  }
}

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function readText(rel: string) {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); } catch { return ""; }
}

function packageMap() {
  try {
    const pkg = JSON.parse(readText("package.json")) as { dependencies?: Record<string,string>; devDependencies?: Record<string,string> };
    return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch {
    return {} as Record<string,string>;
  }
}

async function checkNeon(): Promise<KitCheck> {
  if (!hasEnv("DATABASE_URL")) {
    return { id: "neon", label: "Neon PostgreSQL", status: "missing", detail: "DATABASE_URL manquante.", group: "Services" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await Promise.race([
      sql`select 1 as ok`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return { id: "neon", label: "Neon PostgreSQL", status: "ok", detail: "Connexion SQL réussie.", group: "Services" };
  } catch {
    return { id: "neon", label: "Neon PostgreSQL", status: "missing", detail: "DATABASE_URL présente mais connexion impossible.", group: "Services" };
  }
}

async function checkNgrok(): Promise<KitCheck> {
  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      cache: "no-store",
      signal: AbortSignal.timeout(700),
    });
    if (!response.ok) throw new Error("ngrok unavailable");
    const data = (await response.json()) as { tunnels?: Array<{ public_url?: string }> };
    const publicUrl = data.tunnels?.find((t) => t.public_url?.startsWith("https://"))?.public_url;
    return publicUrl
      ? { id: "ngrok", label: "ngrok", status: "ok", detail: `Tunnel HTTPS détecté : ${publicUrl}`, group: "Paiements" }
      : { id: "ngrok", label: "ngrok", status: "missing", detail: "ngrok tourne mais aucun tunnel HTTPS n'est détecté.", group: "Paiements" };
  } catch {
    return { id: "ngrok", label: "ngrok local", status: "missing", detail: "Non lancé. Utilise npm run payments:ngrok pour tester les webhooks localement.", group: "Paiements" };
  }
}

async function hasGoogleSiteVerificationTxt(appUrl: string): Promise<boolean> {
  if (!appUrl) return false;
  try {
    const { hostname, protocol } = new URL(appUrl);
    if (protocol !== "https:" || hostname === "localhost" || hostname === "127.0.0.1") return false;
    const dns = await import("node:dns/promises");
    const records = await Promise.race([
      dns.resolveTxt(hostname),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return records.some((chunks) => chunks.join("").includes("google-site-verification="));
  } catch {
    return false;
  }
}

export function getMobileAppReadiness(): MobileAppReadiness {
  const config = readConfig();
  const mobile = config && typeof config === "object" ? ((config as KitConfig & { mobileAppEnabled?: boolean; mobileApp?: Record<string, unknown> }).mobileApp || {}) : {};
  const enabled = Boolean((config as (KitConfig & { mobileAppEnabled?: boolean }) | null)?.mobileAppEnabled || mobile.enabled === true);
  const platforms = Array.isArray(mobile.platforms) ? mobile.platforms.map(String).filter((p) => p === "android" || p === "ios") : ["android", "ios"];
  const productionUrl = typeof mobile.productionUrl === "string" && mobile.productionUrl ? mobile.productionUrl : null;
  const appId = typeof mobile.appId === "string" ? mobile.appId : "";
  let packageJson: { dependencies?: Record<string,string>; devDependencies?: Record<string,string> } = {};
  try { packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")); } catch {}
  const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const hasCore = Boolean(deps["@capacitor/core"] && deps["@capacitor/cli"]);
  const androidPkg = Boolean(deps["@capacitor/android"]);
  const iosPkg = Boolean(deps["@capacitor/ios"]);
  const hasCapConfig = exists("capacitor.config.ts");
  const androidProject = exists("android");
  const iosProject = exists("ios");
  const androidStudio = process.platform === "darwin" ? fs.existsSync("/Applications/Android Studio.app") : false;
  const xcode = process.platform === "darwin" ? fs.existsSync("/Applications/Xcode.app") : false;

  const steps = [
    { label: "SaaS Web terminé et validé", done: false },
    { label: "Domaine de production HTTPS renseigné", done: Boolean(productionUrl?.startsWith("https://")) },
    { label: "Mobile App Pipeline activé", done: enabled },
    { label: "App ID / Bundle ID configuré", done: /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*){1,}$/.test(appId) },
    { label: "Capacitor installé", done: hasCore },
    { label: "Projet Android généré", done: !platforms.includes("android") || androidProject },
    { label: "Projet iOS généré", done: !platforms.includes("ios") || iosProject },
    { label: "Configuration WebView générée", done: hasCapConfig },
    { label: "Tests sur appareils réels", done: false },
    { label: "Assets et captures stores prêts", done: false },
    { label: "Builds de publication validés", done: false },
  ];
  const measurable = steps.slice(1, 8);
  const progress = enabled ? Math.round((measurable.filter((x) => x.done).length / measurable.length) * 100) : 0;

  return {
    enabled,
    strategy: "webview-hosted",
    progress,
    productionUrl,
    platforms,
    services: [
      { label: "Capacitor Core + CLI", status: hasCore ? "ok" : "warning", detail: hasCore ? "Installés." : "Installés uniquement après activation avec mobile:app:install." },
      { label: "Capacitor Android", status: !platforms.includes("android") ? "warning" : androidPkg ? "ok" : "warning", detail: platforms.includes("android") ? (androidPkg ? "Package Android installé." : "À installer si Android est activé.") : "Plateforme Android non sélectionnée." },
      { label: "Capacitor iOS", status: !platforms.includes("ios") ? "warning" : iosPkg ? "ok" : "warning", detail: platforms.includes("ios") ? (iosPkg ? "Package iOS installé." : "À installer si iPhone est activé.") : "Plateforme iOS non sélectionnée." },
      { label: "Android Studio + SDK/JDK", status: androidStudio ? "ok" : "warning", detail: androidStudio ? "Android Studio détecté sur ce Mac." : "À installer/vérifier sur la machine de build Android." },
      { label: "Xcode (macOS)", status: xcode ? "ok" : "warning", detail: xcode ? "Xcode détecté sur ce Mac." : "À installer/vérifier sur un Mac pour compiler iOS." },
    ],
    steps,
    assets: ["Logo source haute définition", "Icône carrée de l’app", "Splash / écran de lancement", "Captures Android", "Captures iPhone", "Visuel promotionnel store si requis"],
  };
}

export async function getKitDashboardChecks(): Promise<KitCheck[]> {
  const root = process.cwd();
  const config = readConfig();
  const checks: KitCheck[] = [];

  const [nodeMajor = 0, nodeMinor = 0] = process.versions.node.split(".").map(Number);
  const nodeOk = nodeMajor > 20 || (nodeMajor === 20 && nodeMinor >= 9);
  checks.push({ id: "node", label: "Node.js", status: nodeOk ? "ok" : "missing", detail: `Version active : ${process.versions.node} (>=20.9.0 requis).`, group: "Base" });
  checks.push({ id: "lockfile", label: "package-lock.json", status: exists("package-lock.json") ? "ok" : "missing", detail: exists("package-lock.json") ? "Lockfile présent." : "Exécute npm install puis conserve package-lock.json dans Git.", group: "Base" });
  checks.push({ id: "config", label: "Configuration du kit", status: config ? "ok" : "missing", detail: config ? "africa-saas.config.json présent." : "Lance /setup-saas ou npm run setup pour créer la configuration.", group: "Base" });
  let openAiComputerUseVerified = false;
  let claudeComputerUseVerified = false;
  try {
    const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".africa-saas/computer-use.json"), "utf8")) as { status?: string };
    openAiComputerUseVerified = state.status === "verified";
  } catch {}
  try {
    const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".africa-saas/computer-use-claude.json"), "utf8")) as { status?: string };
    claudeComputerUseVerified = state.status === "verified";
  } catch {}
  const claudeCli = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 1200 });
  const claudeInstalled = claudeCli.status === 0;
  const claudeProjectReady = exists("CLAUDE.md") && exists(".claude/settings.json");
  checks.push({ id: "computer-use-openai", label: "Computer Use — ChatGPT / OpenAI", status: openAiComputerUseVerified ? "ok" : "missing", detail: openAiComputerUseVerified ? "Voyant vert : Browser/Computer Use vérifié par un test réel." : "NON VÉRIFIÉ — exécute /computer-use ou npm run computer-use:openai:check, puis marque la preuve après un vrai test.", group: "Base" });
  checks.push({ id: "claude-code", label: "Claude Code — compatibilité du kit", status: claudeInstalled && claudeProjectReady ? "ok" : claudeProjectReady ? "warning" : "missing", detail: claudeInstalled && claudeProjectReady ? "Claude Code détecté et fichiers projet prêts." : claudeProjectReady ? "Fichiers Claude Code prêts; CLI claude non détecté dans ce shell." : "Exécute npm run claude-code:prepare puis npm run claude-code:check.", group: "Base" });
  checks.push({ id: "computer-use-claude", label: "Computer Use — Claude Code / Anthropic", status: claudeComputerUseVerified ? "ok" : claudeInstalled ? "warning" : "missing", detail: claudeComputerUseVerified ? "Voyant vert : Computer Use/Browser Claude Code vérifié par un test réel." : claudeInstalled ? "Claude Code détecté, mais Computer Use/Browser n’est pas encore vérifié. Lance npm run computer-use:claude:check." : "Claude Code non détecté et Computer Use non vérifié. Installe/ouvre Claude Code, puis lance npm run computer-use:claude:check.", group: "Base" });
  const ownerAdminLayoutText = readText("app/admin/layout.tsx") + "\n" + readText("components/admin/AdminShell.tsx");
  const ownerProductionStateReady = exists("app/admin/production-doctor/page.tsx") && /href[:=]\s*["']\/admin\/production-doctor["']/.test(ownerAdminLayoutText) && ownerAdminLayoutText.includes("État production");
  checks.push({
    id: "owner-production-state",
    label: "État production — tableau de bord propriétaire",
    status: ownerProductionStateReady ? "ok" : "missing",
    detail: ownerProductionStateReady
      ? "Voyant vert : le menu propriétaire et la page de diagnostic production sont installés."
      : "Voyant rouge : ajouter le menu « État production » et la route /admin/production-doctor au tableau de bord propriétaire.",
    group: "Base",
  });

  checks.push({ id: "auth", label: "Better Auth", status: hasEnv("BETTER_AUTH_SECRET") ? "ok" : "missing", detail: hasEnv("BETTER_AUTH_SECRET") ? "Secret Better Auth configuré." : "BETTER_AUTH_SECRET manquant.", group: "Services" });
  const emailPasswordMode = process.env.AUTH_EMAIL_PASSWORD_ENABLED !== "false";
  checks.push({ id: "auth-mode", label: "Mode d’authentification", status: emailPasswordMode || (hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET")) ? "ok" : "missing", detail: emailPasswordMode ? "Email/mot de passe activé (Resend requis en production)." : "Email/mot de passe désactivé : Google OAuth doit être configuré.", group: "Services" });

  checks.push(await checkNeon());

  const emailPasswordEnabled = config ? config.emailPasswordEnabled !== false : process.env.AUTH_EMAIL_PASSWORD_ENABLED !== "false";
  const resendRequired = config?.email === "resend" || emailPasswordEnabled;
  const emailFromValue = process.env.EMAIL_FROM ?? "";
  const resendOk = hasEnv("RESEND_API_KEY") && hasEnv("EMAIL_FROM") && !/@example\.(com|org|net)$/i.test(emailFromValue);
  checks.push({
    id: "resend",
    label: "Resend",
    status: resendOk ? "ok" : resendRequired ? "missing" : "warning",
    detail: resendOk ? "Clé API + adresse EMAIL_FROM présentes; l’envoi réel reste à tester." : resendRequired ? "Email/mot de passe est actif : RESEND_API_KEY + EMAIL_FROM sont requis avant production." : "Optionnel — email/mot de passe désactivé.",
    group: "Services",
  });

  const upstashParts = [hasEnv("UPSTASH_REDIS_REST_URL"), hasEnv("UPSTASH_REDIS_REST_TOKEN")];
  checks.push({
    id: "upstash",
    label: "Cache / rate limiting distribué — Upstash (optionnel)",
    status: upstashParts.every(Boolean) ? "ok" : "missing",
    detail: upstashParts.every(Boolean)
      ? "Voyant vert : Upstash est configuré pour cache TTL / rate limiting distribué; Neon reste la source de vérité."
      : upstashParts.some(Boolean)
        ? "Voyant rouge : configuration Upstash incomplète. Renseigne URL + token ou désactive ce module optionnel."
        : "Voyant rouge : non installé/configuré. Optionnel — le SaaS continue avec Neon comme source de vérité et sans cache distribué.",
    group: "Performance",
    optional: true,
  });

  const googleRequired = Boolean(config?.googleAuth);
  const googleOk = hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET");
  checks.push({ id: "google", label: "Google OAuth", status: googleOk ? "ok" : googleRequired ? "missing" : "warning", detail: googleOk ? "Client ID + secret configurés." : googleRequired ? "Google OAuth activé mais identifiants incomplets." : "Non configuré — optionnel tant qu’un autre mode d’authentification valide est actif.", group: "Services" });

  const searchRequired = Boolean(config?.searchConsole);
  const searchConsoleDnsVerified = searchRequired && !hasEnv("GOOGLE_SITE_VERIFICATION")
    ? await hasGoogleSiteVerificationTxt(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "")
    : false;
  const searchConsoleReady = hasEnv("GOOGLE_SITE_VERIFICATION") || searchConsoleDnsVerified;
  checks.push({
    id: "search-console",
    label: "Google Search Console",
    status: searchConsoleReady ? "ok" : searchRequired ? "missing" : "warning",
    detail: searchConsoleDnsVerified
      ? "Propriété vérifiée : enregistrement TXT DNS google-site-verification détecté publiquement."
      : hasEnv("GOOGLE_SITE_VERIFICATION")
        ? "Jeton de vérification (balise HTML) configuré. La validation dans Search Console reste à confirmer."
        : searchRequired
          ? "Search Console prévu mais ni GOOGLE_SITE_VERIFICATION ni TXT DNS google-site-verification détecté."
          : "Non configuré — optionnel.",
    group: "Services",
  });

  const cloudinaryOk = hasEnv("CLOUDINARY_CLOUD_NAME") && hasEnv("CLOUDINARY_API_KEY") && hasEnv("CLOUDINARY_API_SECRET");
  checks.push({ id: "cloudinary", label: "Cloudinary images (optionnel)", status: cloudinaryOk ? "ok" : "warning", detail: cloudinaryOk ? "Variables Cloudinary présentes; un upload réel reste à tester." : "Non configuré. Valide pour un SaaS sans upload d’images; décision en Phase 18.", group: "Services" });

  const enabledProviders = config?.providers ?? [];
  if (!enabledProviders.length) {
    checks.push({ id: "payments-config", label: "Paiements (optionnel)", status: "warning", detail: "Aucun provider activé. C’est valide : les paiements ne sont configurés qu’en Phase 16 si le SaaS en a besoin.", group: "Paiements" });
  }
  for (const id of enabledProviders) {
    const provider = providersCatalog[id as keyof typeof providersCatalog];
    if (!provider) continue;
    const present = provider.env.filter((name) => hasEnv(name));
    checks.push({
      id: `provider:${id}`,
      label: provider.label,
      status: present.length === provider.env.length ? "ok" : "missing",
      detail: present.length === provider.env.length ? `Variables requises présentes (${provider.readiness}).` : `${present.length}/${provider.env.length} variable(s) requise(s) configurée(s).`,
      group: "Paiements",
    });
  }

  if (enabledProviders.length) {
    checks.push({ id: "webhook-base", label: "URL webhooks", status: hasEnv("PAYMENT_WEBHOOK_BASE_URL") ? "ok" : "missing", detail: hasEnv("PAYMENT_WEBHOOK_BASE_URL") ? `PAYMENT_WEBHOOK_BASE_URL configurée.` : "Manquante. En local, utilise ngrok + npm run payments:local:apply.", group: "Paiements" });
    checks.push(await checkNgrok());
  }

  const headersText = readText("lib/security/headers.ts");
  const proxyText = readText("proxy.ts");
  const cspPresent = /Content-Security-Policy/i.test(headersText) || /Content-Security-Policy/i.test(proxyText);
  // Seule la directive script-src compte ici : style-src conserve légitimement 'unsafe-inline'
  // (pas d'équivalent nonce pour l'attribut HTML style="...", utilisé via React style={{}}).
  const scriptSrcLine = headersText.split("\n").find((l) => /script-src/i.test(l) && !/^\s*(\*|\/\/)/.test(l)) || "";
  const cspHasUnsafeInline = /unsafe-inline/i.test(scriptSrcLine);
  const nonceSources = [headersText, proxyText, readText("middleware.ts")].join("\n");
  const cspHasNonce = /nonce|x-nonce|nonce-/i.test(nonceSources);
  checks.push({
    id: "csp-nonce",
    label: "CSP sans unsafe-inline — nonces",
    status: cspPresent && !cspHasUnsafeInline && cspHasNonce ? "ok" : "missing",
    detail: cspPresent && !cspHasUnsafeInline && cspHasNonce
      ? "Voyant vert : CSP renforcée avec stratégie nonce et sans unsafe-inline."
      : cspPresent
        ? "Voyant rouge : CSP présente mais encore permissive. Passer scripts/styles à une stratégie de nonces Next.js avant le niveau sécurité maximum."
        : "Voyant rouge : CSP non détectée. Ajouter une Content-Security-Policy compatible Next.js puis migrer vers les nonces.",
    group: "Sécurité",
  });

  const turnstileFiles = exists("components/turnstile-widget.tsx") && exists("lib/security/turnstile.ts");
  const turnstileEnv = hasEnv("TURNSTILE_SECRET_KEY") && (hasEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY") || hasEnv("TURNSTILE_SITE_KEY"));
  const turnstileClientText = readText("components/auth-form.tsx") + "\n" + readText("components/forgot-password-form.tsx");
  const turnstileServerText = readText("lib/security/turnstile.ts");
  const publicFormProtected = /TurnstileWidget/.test(turnstileClientText) && /siteverify/.test(turnstileServerText);
  checks.push({
    id: "turnstile",
    label: "Cloudflare Turnstile — formulaires publics",
    status: turnstileFiles && turnstileEnv && publicFormProtected ? "ok" : "missing",
    detail: turnstileFiles && turnstileEnv && publicFormProtected
      ? "Voyant vert : Turnstile est câblé et les clés sont configurées pour l'inscription/formulaires publics."
      : turnstileFiles
        ? "Voyant rouge : module Turnstile présent mais configuration/protection publique incomplète. Configure les clés et vérifie inscription + formulaires exposés."
        : "Voyant rouge : Turnstile n'est pas installé. Ajouter le widget + vérification serveur avant production publique.",
    group: "Sécurité",
  });

  const deps = packageMap();
  const playwrightPkg = Boolean(deps["@playwright/test"] || deps["playwright"] || deps["playwright-core"]);
  const playwrightConfig = ["playwright.config.ts", "playwright.config.mts", "playwright.config.js", "playwright.config.mjs"].some(exists);
  const claudeMcpText = readText(".claude/settings.json") + "\n" + readText(".codex/config.toml") + "\n" + readText(".mcp.json");
  const playwrightMcp = /playwright/i.test(claudeMcpText);
  checks.push({
    id: "playwright",
    label: "Playwright — tests navigateur / MCP",
    status: playwrightPkg || playwrightConfig || playwrightMcp ? "ok" : "missing",
    detail: playwrightPkg || playwrightConfig || playwrightMcp
      ? `Voyant vert : Playwright détecté${playwrightMcp ? " via configuration MCP" : playwrightConfig ? " via configuration du projet" : " dans les dépendances"}.`
      : "Voyant rouge : Playwright non détecté dans le projet ni dans les configurations MCP connues. Optionnel mais recommandé pour les tests E2E/browser.",
    group: "Qualité",
    optional: true,
  });

  checks.push({ id: "health", label: "API health / readiness", status: exists("app/api/health/route.ts") && exists("app/api/readyz/route.ts") ? "ok" : "missing", detail: "Sondes /api/health et /api/readyz présentes.", group: "Qualité" });
  checks.push({ id: "runtime", label: "Runtime API Node.js", status: exists("scripts/runtime-check.mjs") ? "ok" : "missing", detail: "Gate runtime:check présent pour empêcher un passage accidentel en Edge.", group: "Qualité" });
  checks.push({ id: "features", label: "Inventaire anti-doublons", status: exists("config/features.json") && exists("scripts/feature-inventory.mjs") ? "ok" : "missing", detail: "Manifeste des responsabilités de features/routes présent.", group: "Qualité" });
  checks.push({ id: "observability", label: "Observabilité de base", status: exists("lib/observability/logger.ts") && exists("lib/observability/request-id.ts") ? "ok" : "missing", detail: "Logs structurés + redaction + request IDs présents.", group: "Qualité" });
  checks.push({ id: "tests", label: "Tests unitaires", status: exists("vitest.config.ts") && exists("tests/payments/provider-base.test.ts") ? "ok" : "missing", detail: "Vitest et tests des garde-fous sensibles présents.", group: "Qualité" });
  checks.push({ id: "lint-format", label: "Lint / format", status: exists("eslint.config.mjs") && exists(".prettierrc.json") ? "ok" : "missing", detail: "ESLint Next.js + Prettier configurés.", group: "Qualité" });
  checks.push({ id: "security", label: "Sécurité", status: exists("SECURITY.md") && exists("scripts/security-audit.sh") ? "ok" : "missing", detail: "Audit et contrôles de sécurité du kit.", group: "Qualité" });
  checks.push({ id: "mobile", label: "Mobile-first", status: exists("scripts/mobile-first-check.mjs") && exists("components/mobile-bottom-nav.tsx") ? "ok" : "missing", detail: "Navigation et gates mobile-first présents.", group: "Qualité" });
  checks.push({ id: "skeleton", label: "Skeleton loaders", status: exists("components/ui/skeleton.tsx") && exists("scripts/loading-check.mjs") ? "ok" : "missing", detail: "Primitives et contrôle de chargement présents.", group: "Qualité" });
  checks.push({ id: "seo", label: "SEO / Social Preview", status: exists("app/sitemap.ts") && exists("app/opengraph-image.tsx") && exists("scripts/seo-check.mjs") ? "ok" : "missing", detail: "Sitemap, Open Graph et SEO gate présents.", group: "Qualité" });
  {
    const codexPath = path.join(root, ".codex/config.toml");
    const codexText = fs.existsSync(codexPath) ? fs.readFileSync(codexPath, "utf8") : "";
    const mcpOk = /\[\s*mcp_servers\.banani\s*\]/i.test(codexText) && /Authorization/i.test(codexText);
    checks.push({ id: "banani", label: "Banani MCP / Implementation Planner", status: mcpOk && exists("DESIGN.md") && exists("scripts/generate-implementation-plan.mjs") ? "ok" : "missing", detail: mcpOk ? "MCP Banani configuré localement; token non affiché." : "Exécute npm run banani:prepare puis complète .codex/config.toml manuellement.", group: "Qualité" });
  }

  let stagingApproved = false;
  try {
    const staging = JSON.parse(fs.readFileSync(path.join(root, "generated/staging-approval.json"), "utf8")) as { status?: string; url?: string };
    stagingApproved = staging.status === "pass" && Boolean(staging.url?.startsWith("https://"));
  } catch {}
  checks.push({ id: "staging", label: "Staging Vercel avant Production", status: stagingApproved ? "ok" : "warning", detail: stagingApproved ? "Preview testée et approuvée. Gate Production disponible." : "Obligatoire avant Production : staging:deploy → staging:test → staging:approve.", group: "Qualité" });

  return checks;
}
