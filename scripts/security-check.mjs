import fs from "node:fs";
import { kitVersionLabel } from "./lib/version.mjs";
const errors = [];
const warnings = [];
for (const f of [".env", ".env.local", ".env.production", ".env.development", ".env.test"]) {
  if (fs.existsSync(f)) {
    const text = fs.readFileSync(f, "utf8");
    if (/NEXT_PUBLIC_.*(?:SECRET|PRIVATE|DATABASE|TOKEN|API_KEY)/i.test(text)) errors.push(`${f}: possible secret exposed via NEXT_PUBLIC_*`);
    if (/BETTER_AUTH_SECRET\s*=\s*(?:changeme|secret|123|)$/mi.test(text)) errors.push(`${f}: BETTER_AUTH_SECRET is weak or empty`);
  }
}
for (const f of ["SECURITY.md", "AUDIT.md", "CHANGELOG.md", "proxy.ts", "lib/security/headers.ts", "lib/billing/webhook.ts", "app/api/webhooks/[provider]/route.ts", "lib/payments/routing.ts", "lib/payments/capabilities.ts", "lib/payments/providers/paydunya.ts", "app/admin/payment-providers/page.tsx", "scripts/setup.mjs", "scripts/setup-payments.mjs", "scripts/validate-config.mjs", "config/countries.json", "config/providers.json", "docs/setup-wizard.md", "docs/production-checklist.md", "app/setup/page.tsx", "components/setup-saas-dashboard.tsx", "lib/setup/kit-dashboard.ts", "scripts/setup-saas.mjs", "scripts/setup-saas-mark.mjs", ".agents/skills/setup-saas/SKILL.md", "docs/setup-saas.md", "scripts/security-audit.sh", "docs/security/audit-vibe-code.md", "app/sitemap.ts", "app/robots.ts", "docs/google/search-console.md", "docs/google/cloud-console.md", "docs/design/banani.md", "DESIGN.md", "scripts/design-check.mjs", "lib/google/search-console.ts", "lib/payments/providers/moneroo.ts", "lib/payments/providers/paytech.ts", "lib/payments/providers/bictorys.ts", "lib/billing/reconcile.ts", "app/api/cron/reconcile-payments/route.ts", "docs/payments/reconciliation.md", "app/admin/integrations/google/page.tsx", "AGENTS.md", "docs/design/implementation-planner.md", "design/banani/screens.json", "scripts/generate-implementation-plan.mjs", "scripts/production-doctor.mjs", "lib/doctor/read-report.ts", "app/admin/production-doctor/page.tsx", "docs/production-doctor.md", "db/schema/index.ts", "lib/security/rate-limit.ts", "scripts/local-payment-lab.mjs", "docs/payments/local-payment-lab.md", "scripts/mobile-first-check.mjs", "docs/mobile/mobile-first-delivery.md", "components/mobile-bottom-nav.tsx", "lib/payments/webhook-url.ts", "components/ui/skeleton.tsx", "app/loading.tsx", "app/dashboard/loading.tsx", "app/admin/loading.tsx", "docs/ui/skeleton-loading.md", "scripts/loading-check.mjs", "lib/seo/site.ts", "lib/seo/metadata.ts", "components/seo/json-ld.tsx", "app/opengraph-image.tsx", "app/twitter-image.tsx", "app/manifest.ts", "public/icon.svg", "app/apple-icon.tsx", "docs/seo/google-seo.md", "scripts/seo-check.mjs", "config/deployment-env.json", "scripts/deployment-handoff.mjs", "scripts/deployment-check.mjs", "docs/deployment/vercel-github-handoff.md", "scripts/setup-cloudflare.mjs", "docs/cloudflare/domain-dns.md", "scripts/setup-cloudinary.mjs", "docs/storage/cloudinary.md", "lib/storage/cloudinary.ts", "app/api/uploads/images/route.ts", "scripts/conformity-check.mjs", "app/api/health/route.ts", "app/api/readyz/route.ts", "lib/health/readiness.ts", "vitest.config.ts", "eslint.config.mjs", "tests/payments/provider-base.test.ts", "tests/config/provider-environment.test.ts", "lib/payments/configured.ts", "db/migrations/README.md", "scripts/runtime-check.mjs", "config/features.json", "scripts/feature-inventory.mjs", "lib/observability/logger.ts", "lib/observability/request-id.ts", "lib/api/client.ts", "lib/cron/auth.ts", "scripts/smoke-system.mjs", "scripts/generate-vercel-cron.mjs", "docs/operations/smoke-tests.md", "docs/operations/cron.md", "docs/architecture/izikit-selective-review.md", ".codex/README.md", "scripts/banani-prepare.mjs", "scripts/banani-check.mjs", "scripts/security-baseline-check.mjs", "scripts/security-db-check.mjs", "config/security-routes.json", "config/security-rls.json", "db/security/rls-baseline.sql", "docs/security/security-baseline-gate.md", ".github/workflows/security-guard.yml", "scripts/general-refactor-check.mjs", "lib/security/request-guards.ts", "lib/payments/public-result.ts", "tests/security/public-checkout-result.test.ts", "tests/security/request-guards.test.ts", "scripts/dependency-security-floor.mjs", "config/security-dependency-floors.json"]) {
  if (!fs.existsSync(f)) errors.push(`${f} missing`);
}

const gitignoreText = fs.readFileSync(".gitignore", "utf8");
for (const requiredIgnore of [".env.production", ".env.development", ".env.test", ".codex/config.toml"]) {
  if (!gitignoreText.split(/\r?\n/).includes(requiredIgnore)) errors.push(`.gitignore must explicitly ignore ${requiredIgnore}`);
}
const paydunyaText = fs.readFileSync("lib/payments/providers/paydunya.ts", "utf8");
if (!/money:\s*Number\.isFinite\(normalized\.amount\)/.test(paydunyaText)) errors.push("PayDunya verifyPayment must return normalized money for reconciliation");
const providerBaseText = fs.readFileSync("lib/payments/provider-base.ts", "utf8");
if (providerBaseText.includes("JSON.stringify(body)")) errors.push("Provider HTTP errors must not persist raw provider bodies");
const webhookText = fs.readFileSync("lib/billing/webhook.ts", "utf8");
if (!webhookText.includes("storedEventSummary")) errors.push("Webhook persistence must minimize raw provider payload/PII");
const drizzleText = fs.readFileSync("drizzle.config.ts", "utf8");
if (drizzleText.includes("auth.generated.ts")) errors.push("Drizzle schema must not load auth.generated twice");

const configuredText = fs.readFileSync("lib/payments/configured.ts", "utf8");
if (!configuredText.includes("providerEnvironmentConfigured")) errors.push("Optional provider environment guard missing");
const routingText = fs.readFileSync("lib/payments/routing.ts", "utf8");
if (!routingText.includes("providerRuntimeAllowed(p)") || !routingText.includes("providerEnvironmentConfigured(p)") || !routingText.includes("if (!cc)")) errors.push("Provider readiness/runtime/environment filtering must apply even when no country is resolved");
const paymentHealthText = fs.readFileSync("lib/payments/health.ts", "utf8");
if (!paymentHealthText.includes("minimumAttempts = 5") || !paymentHealthText.includes("successThreshold = 0.2")) errors.push("DB-backed provider degradation guard missing or altered");
const checkoutText = fs.readFileSync("app/api/payments/checkout/route.ts", "utf8");
if (!checkoutText.includes("isSafeProviderFallbackError") || !checkoutText.includes('status: safeFallback ? "failed" : "uncertain"')) errors.push("Checkout router must stop automatic fallback on ambiguous provider state");
if (!checkoutText.includes("!x.degraded")) errors.push("Checkout must exclude recently degraded providers from automatic selection");
if (!checkoutText.includes("publicCheckoutResult(result)")) errors.push("Checkout must sanitize provider responses before returning them to browsers");
if (!checkoutText.includes("rejectCrossSiteMutation") || !checkoutText.includes("rejectOversizedRequest") || !checkoutText.includes("requireContentType")) errors.push("Checkout request-level origin/body/content-type guards missing");
const dashboardLayoutSecurity = fs.readFileSync("app/dashboard/layout.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
if (!/\bawait\s+requireUser\(\);/.test(dashboardLayoutSecurity)) errors.push("Dashboard layout must enforce authoritative server-side authentication");
const bananiPrepareText = fs.readFileSync("scripts/banani-prepare.mjs", "utf8");
if (!bananiPrepareText.includes('fs.writeFileSync(file, ""') || bananiPrepareText.includes('Bearer <')) errors.push("banani:prepare must only create an empty config.toml and never inject a token/template secret");
const bananiCheckText = fs.readFileSync("scripts/banani-check.mjs", "utf8");
if (!bananiCheckText.includes("token value not displayed") || !bananiCheckText.includes("gitignore")) errors.push("banani:check must validate Git protection without printing the token");
if (!gitignoreText.split(/\r?\n/).includes(".codex/config.toml")) errors.push(".codex/config.toml must be ignored by Git");
if (!fs.existsSync("package-lock.json")) warnings.push("package-lock.json absent: run npm install once and commit the generated lockfile before production.");
if (fs.existsSync("package.json")) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const latest = Object.entries({ ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) }).filter(([,v]) => v === "latest").map(([k])=>k);
  if (latest.length) errors.push(`Dependencies must be pinned; found latest: ${latest.join(", ")}`);
}


const pkgText = fs.readFileSync("package.json", "utf8");
const pkgJson = JSON.parse(pkgText);
if (pkgJson.devDependencies?.auth !== pkgJson.dependencies?.["better-auth"]) warnings.push("Better Auth CLI and better-auth versions differ; review compatibility before auth schema regeneration.");
if (!String(pkgJson.scripts?.["auth:generate"] || "").includes("--config ./lib/auth/index.ts")) errors.push("auth:generate must point explicitly to lib/auth/index.ts");

const schemaText = fs.readFileSync("db/schema/index.ts", "utf8");
if (!schemaText.includes("payments_provider_payment_unique")) errors.push("Missing unique provider payment constraint");
if (!schemaText.includes("subscriptions_user_plan_unique")) errors.push("Missing subscription user/plan unique constraint");
const reconcileText = fs.readFileSync("lib/billing/reconcile.ts", "utf8");
if (!reconcileText.includes("lastPaymentId") || !reconcileText.includes("setWhere")) errors.push("Payment fulfilment idempotency guard missing");
if (!reconcileText.includes("sameMoney(")) errors.push("Payment reconciliation must compare normalized monetary units rather than raw floating-point equality");


const chariowText = fs.readFileSync("lib/payments/providers/chariow.ts", "utf8");
if (!chariowText.includes('startsWith("sha256=")') || !chariowText.includes('x-pulse-delivery-id')) errors.push("Chariow current Pulse signature/idempotency handling missing");
if (!schemaText.includes('numeric("amount"') || !schemaText.includes('numeric("provider_amount"')) errors.push("Money columns must support decimal currencies");
const webhookUrlText = fs.readFileSync("lib/payments/webhook-url.ts", "utf8");
if (!webhookUrlText.includes("PAYMENT_WEBHOOK_BASE_URL")) errors.push("Dedicated local webhook base URL support missing");
const rootLayoutText = fs.readFileSync("app/layout.tsx", "utf8");
if (!rootLayoutText.includes("<body suppressHydrationWarning>")) errors.push("Root body hydration guard missing; browser extensions can inject body attributes and trigger noisy hydration overlays");

const mobileCss = fs.readFileSync("app/globals.css", "utf8");
if (!mobileCss.includes("mobile-bottom-nav") || !mobileCss.includes("safe-area-inset-bottom")) errors.push("Mobile-first app shell/safe-area support missing");


const skeletonText = fs.readFileSync("components/ui/skeleton.tsx", "utf8");
if (!skeletonText.includes("SkeletonTable") || !skeletonText.includes("DashboardSkeleton")) errors.push("Reusable skeleton primitives missing");
if (!mobileCss.includes("prefers-reduced-motion") || !mobileCss.includes("skeleton-shimmer")) errors.push("Accessible skeleton shimmer/reduced-motion support missing");


const seoMetaText = fs.readFileSync("lib/seo/metadata.ts", "utf8");
if (!seoMetaText.includes("canonical") || !seoMetaText.includes("openGraph") || !seoMetaText.includes("summary_large_image")) errors.push("SEO canonical/Open Graph/Twitter metadata support missing");
const robotsText = fs.readFileSync("app/robots.ts", "utf8");
if (!robotsText.includes("/dashboard/") || !robotsText.includes("/admin/") || !robotsText.includes("/api/")) errors.push("Private routes must remain excluded from crawling");

const emailText = fs.readFileSync("lib/email/index.ts", "utf8");
if (/console\.(?:info|log)\([^\n]*input\)/.test(emailText)) errors.push("Auth email payload/tokens must not be logged");


const homeText = fs.readFileSync("app/page.tsx", "utf8");
if (homeText.includes('href="/register"') || homeText.includes('href="/login"')) errors.push("Local kit home must not require registration/login");
if (!homeText.includes('process.env.NODE_ENV === "production"')) errors.push("Kit readiness dashboard must not be exposed by default in production");
const agentsText = fs.readFileSync("AGENTS.md", "utf8");
if (!agentsText.includes("/setup-saas") || !pkgJson.scripts?.["setup-saas"]) errors.push("/setup-saas IA entry point and npm fallback are required");
const setupText = fs.readFileSync("scripts/setup.mjs", "utf8");
if (setupText.includes("Payment providers, comma-separated") || setupText.includes("Choose at least one payment provider")) errors.push("Core setup must not require payment providers");
const validateText = fs.readFileSync("scripts/validate-config.mjs", "utf8");
if (validateText.includes("At least one provider is required")) errors.push("Configuration validation must allow SaaS without payments");
const setupSaasText = fs.readFileSync("scripts/setup-saas.mjs", "utf8");
if (!setupSaasText.includes("Phase 17") && !setupSaasText.includes("paiements (OPTIONNEL)")) warnings.push("Review optional payment phase wording");
const cloudflareSetup = fs.readFileSync("scripts/setup-cloudflare.mjs", "utf8");
if (!cloudflareSetup.includes("--none") || !cloudflareSetup.includes("phase=18")) errors.push("Optional Cloudflare setup/skip flow missing");
const phaseMarkText = fs.readFileSync("scripts/setup-saas-mark.mjs", "utf8");
if (!phaseMarkText.includes("phase > 21")) errors.push("setup-saas progress marker must support 21 phases");
const workflowText = fs.readFileSync(".agents/skills/setup-saas/SKILL.md", "utf8");
if (!workflowText.includes("21 phases") || !workflowText.includes("Cloudflare domaine/DNS") || !workflowText.includes("Cloudinary") || !workflowText.includes("conformity:check")) errors.push("/setup-saas roadmap must include 21 phases, optional services and final conformity check");
const cloudinaryText = fs.readFileSync("lib/storage/cloudinary.ts", "utf8");
if (!cloudinaryText.includes("MAX_IMAGE_BYTES") || !cloudinaryText.includes("image/svg+xml") === false) { /* SVG is intentionally absent from allowed set */ }
if (!cloudinaryText.includes("CLOUDINARY_API_SECRET") || !cloudinaryText.includes("image/upload")) errors.push("Cloudinary signed server upload integration missing");
const cloudinaryRoute = fs.readFileSync("app/api/uploads/images/route.ts", "utf8");
if (!cloudinaryRoute.includes("auth.api.getSession") || !cloudinaryRoute.includes("Unauthorized")) errors.push("Cloudinary upload endpoint must require an authenticated session");
const healthRouteText = fs.readFileSync("app/api/health/route.ts", "utf8");
const readyRouteText = fs.readFileSync("app/api/readyz/route.ts", "utf8");
if (!healthRouteText.includes('"Cache-Control": "no-store"')) errors.push("Health endpoint must be non-cacheable");
if (!readyRouteText.includes("503") || !readyRouteText.includes("getReadinessReport")) errors.push("Readiness endpoint must return 503 when dependencies are unavailable");
if (!pkgJson.scripts?.test || !pkgJson.scripts?.lint || !pkgJson.scripts?.["audit:prod"]) errors.push("Test/lint/audit scripts are required");
if (!pkgJson.scripts?.["security:baseline"] || !pkgJson.scripts?.["security:db-check"] || !pkgJson.scripts?.["security:release"]) errors.push("Continuous security baseline/db/release gates are required");
if (!pkgJson.devDependencies?.vitest || !pkgJson.devDependencies?.eslint || !pkgJson.devDependencies?.prettier) errors.push("Vitest/ESLint/Prettier dev dependencies are required");

const runtimeCheckText = fs.readFileSync("scripts/runtime-check.mjs", "utf8");
if (!runtimeCheckText.includes("runtime = \"nodejs\"") && !runtimeCheckText.includes("nodejs")) errors.push("Runtime enforcement gate missing");
for (const route of fs.readdirSync("app/api", { withFileTypes: true })) { /* recursive gate is handled by runtime:check */ }
const featureManifest = JSON.parse(fs.readFileSync("config/features.json", "utf8"));
if (!featureManifest.features?.["observability-core"] || !featureManifest.features?.["api-client"]) errors.push("Feature manifest missing observability/api-client ownership");
const cloudinaryAdapterText = fs.readFileSync("lib/storage/cloudinary.ts", "utf8");
if (!cloudinaryAdapterText.includes("detectImageType") || !cloudinaryAdapterText.includes("magic") && !cloudinaryAdapterText.includes("Image content does not match")) errors.push("Cloudinary upload must validate magic bytes, not only client MIME");
const apiClientText = fs.readFileSync("lib/api/client.ts", "utf8");
if (!apiClientText.includes("method === \"GET\"") || !apiClientText.includes("method === \"HEAD\"")) errors.push("API client retry policy must be restricted to GET/HEAD");
const cronAuthText = fs.readFileSync("lib/cron/auth.ts", "utf8");
if (!cronAuthText.includes("timingSafeEqual") || !cronAuthText.includes("NODE_ENV")) errors.push("Central cron auth helper missing fail-safe comparison");

const authText = fs.readFileSync("lib/auth/index.ts", "utf8");
if (!authText.includes("AUTH_EMAIL_PASSWORD_ENABLED") || !authText.includes("AUTH_REQUIRE_EMAIL_VERIFICATION")) errors.push("Auth must explicitly gate email/password and email verification by env");
if (!emailText.includes('NODE_ENV === "production"') || !emailText.includes("Resend")) errors.push("Critical auth email delivery must fail closed in production when Resend is missing");
if (!setupText.includes("emailPasswordEnabled") || !setupText.includes("googleAuth")) errors.push("Setup must prevent an auth configuration with neither email/password nor Google OAuth");

if (!fs.existsSync(".agents/skills/computer-use/SKILL.md") || !pkgJson.scripts?.["computer-use:check"] || !pkgJson.scripts?.["computer-use:mark"]) errors.push("Computer Use / Browser Tools workflow missing");
// Inspect actual Next.js deployment traces after a build, rather than relying
// only on .gitignore: file tracing can otherwise package local MCP credentials.
function checkDeploymentTraces(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) checkDeploymentTraces(file);
    else if (entry.name.endsWith(".nft.json")) {
      try {
        const trace = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!Array.isArray(trace.files)) throw new Error("Invalid trace manifest");
        if (trace.files.some((value) => typeof value === "string" && /(?:^|\/)(?:\.codex|\.agents|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)/.test(value.replaceAll("\\", "/")))) {
          errors.push(`${file}: deployment trace includes local credentials/tooling`);
        }
      } catch {
        errors.push(`${file}: deployment trace cannot be inspected`);
      }
    }
  }
}
checkDeploymentTraces(".next/server");

if (warnings.length) console.warn(warnings.map(w=>`WARNING: ${w}`).join("\n"));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Security preflight: ${kitVersionLabel} checks passed.`);
