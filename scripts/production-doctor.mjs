#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import { execFileSync } from 'node:child_process';
import { kitVersion, kitVersionLabel } from "./lib/version.mjs";

const root = process.cwd();
const online = process.argv.includes('--online');
const jsonMode = process.argv.includes('--json');
const envPath = path.join(root, '.env.local');
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = Object.fromEntries(envText.split(/\r?\n/).filter(Boolean).filter(l=>!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('='); return i<0?[l.trim(),'']:[l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const readJSON = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const results=[];
const add=(id,label,status,detail,category='core')=>results.push({id,label,status,detail,category});
const exists=p=>fs.existsSync(path.join(root,p));

let cfg=null;
try { cfg=exists('africa-saas.config.json')?readJSON('africa-saas.config.json'):null; } catch {}
add('config','Configuration SaaS',cfg?'PASS':'WARN',cfg?'africa-saas.config.json présent':'Lancer /setup-saas ou npm run setup','setup');
const enabledProviders = Array.isArray(cfg?.providers) ? cfg.providers : [];
const paymentsEnabled = cfg?.paymentsEnabled === true || enabledProviders.length > 0;
add('env','Variables environnement',exists('.env.local')?'PASS':'WARN',exists('.env.local')?'.env.local présent':'Créer .env.local depuis .env.example','setup');
add('gitignore','Protection .env',exists('.gitignore') && /\.env/.test(fs.readFileSync(path.join(root,'.gitignore'),'utf8'))?'PASS':'FAIL','.gitignore doit couvrir .env*','security');
add('lockfile','Lockfile dépendances',exists('package-lock.json')||exists('pnpm-lock.yaml')||exists('yarn.lock')?'PASS':'FAIL','Un lockfile réel doit être commité','security');

const secret=env.BETTER_AUTH_SECRET||process.env.BETTER_AUTH_SECRET||'';
add('auth-secret','Secret Better Auth',secret.length>=32?'PASS':'FAIL',secret.length>=32?'Secret présent et suffisamment long':'BETTER_AUTH_SECRET manquant ou trop court','auth');
add('database','Neon DATABASE_URL',(env.DATABASE_URL||process.env.DATABASE_URL)?'PASS':'FAIL','DATABASE_URL requis côté serveur','database');
const emailPasswordEnabled = cfg ? cfg.emailPasswordEnabled !== false : (env.AUTH_EMAIL_PASSWORD_ENABLED ?? process.env.AUTH_EMAIL_PASSWORD_ENABLED) !== 'false';
const needsResend = cfg ? (cfg.email === 'resend' || emailPasswordEnabled) : emailPasswordEnabled;
const emailFrom = env.EMAIL_FROM || process.env.EMAIL_FROM || '';
const resendConfigured = Boolean((env.RESEND_API_KEY||process.env.RESEND_API_KEY) && emailFrom && !/@example\.(com|org|net)$/i.test(emailFrom));
add('resend','Resend',!cfg?'UNVERIFIED':!needsResend?'PASS':resendConfigured?'PASS':'FAIL',!cfg?'Configuration non générée':!needsResend?'Email/password désactivé; Resend optionnel':resendConfigured?'Clé Resend + EMAIL_FROM présents':'Resend requis pour email/password en production','email');
const requireEmailVerification = (env.AUTH_REQUIRE_EMAIL_VERIFICATION ?? process.env.AUTH_REQUIRE_EMAIL_VERIFICATION) !== 'false';
const configuredSecurityLevel = cfg?.securityLevel || env.SECURITY_LEVEL || process.env.SECURITY_LEVEL || 'high';
const verificationStatus = !emailPasswordEnabled ? 'PASS' : requireEmailVerification ? 'PASS' : ['high','maximum'].includes(configuredSecurityLevel) ? 'FAIL' : 'WARN';
add('email-verification','Vérification e-mail',verificationStatus,!emailPasswordEnabled?'Email/password désactivé':requireEmailVerification?'Vérification e-mail activée':'AUTH_REQUIRE_EMAIL_VERIFICATION=false : réduction explicite de sécurité','auth');
const strongSecurity = !cfg || ['high','maximum'].includes(cfg.securityLevel);
add('turnstile','Turnstile',(env.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET_KEY)?'PASS':strongSecurity?'WARN':'UNVERIFIED',(env.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET_KEY)?'Secret Turnstile présent':'À configurer pour protéger inscription et formulaires publics','security');
const upstashReady = Boolean((env.UPSTASH_REDIS_REST_URL||process.env.UPSTASH_REDIS_REST_URL) && (env.UPSTASH_REDIS_REST_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN));
add('upstash','Cache / rate limiting distribué (optionnel)',upstashReady?'PASS':'WARN',upstashReady?'Upstash configuré':'Optionnel : Neon reste la source de vérité; sans Upstash, le cache distribué est désactivé','performance');
const cloudinaryEnabled = cfg?.cloudinaryEnabled === true;
const cloudinaryVarsOk = Boolean((env.CLOUDINARY_CLOUD_NAME||process.env.CLOUDINARY_CLOUD_NAME) && (env.CLOUDINARY_API_KEY||process.env.CLOUDINARY_API_KEY) && (env.CLOUDINARY_API_SECRET||process.env.CLOUDINARY_API_SECRET));
add('cloudinary','Cloudinary images',!cfg?'UNVERIFIED':!cloudinaryEnabled?'PASS':cloudinaryVarsOk?'WARN':'FAIL',!cfg?'Configuration non générée':!cloudinaryEnabled?'Désactivé par configuration':cloudinaryVarsOk?'Variables présentes; upload réel à valider en staging':'Cloudinary activé mais variables manquantes','storage');
const needsR2 = cfg?.storage === 'cloudflare-r2';
const r2Impl = exists('lib/storage/r2.ts');
add('r2','Cloudflare R2',!cfg?'UNVERIFIED':!needsR2?'PASS':!r2Impl?'FAIL':(env.CLOUDFLARE_R2_ACCOUNT_ID||process.env.CLOUDFLARE_R2_ACCOUNT_ID)?'PASS':'FAIL',!cfg?'Configuration non générée':!needsR2?'Désactivé par configuration':!r2Impl?'R2 demandé mais adaptateur stockage absent':(env.CLOUDFLARE_R2_ACCOUNT_ID||process.env.CLOUDFLARE_R2_ACCOUNT_ID)?'Configuration R2 détectée':'CLOUDFLARE_R2_ACCOUNT_ID requis par la configuration','storage');

const googleOAuth=(env.GOOGLE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID) && (env.GOOGLE_CLIENT_SECRET||process.env.GOOGLE_CLIENT_SECRET);
const needsGoogleOAuth = Boolean(cfg?.googleAuth);
add('google-oauth','Google Cloud OAuth',!needsGoogleOAuth?'PASS':googleOAuth?'PASS':'FAIL',!needsGoogleOAuth?'Désactivé par configuration':googleOAuth?'Client ID/secret présents':'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET requis','google');
const seoFiles = exists('app/sitemap.ts')&&exists('app/robots.ts')&&exists('app/opengraph-image.tsx')&&exists('lib/seo/metadata.ts');
const needsSearchConsole = Boolean(cfg?.searchConsole);
add('search-console','Google Search Console',!needsSearchConsole?'PASS':seoFiles?'UNVERIFIED':'FAIL',!needsSearchConsole?'Désactivé par configuration':seoFiles?'SEO technique + social preview présents; propriété Google à vérifier manuellement/DNS':'sitemap.ts ou robots.ts manquant','google');

const providerVars={
  fedapay:['FEDAPAY_SECRET_KEY','FEDAPAY_WEBHOOK_SECRET'], paydunya:['PAYDUNYA_MASTER_KEY','PAYDUNYA_PRIVATE_KEY','PAYDUNYA_TOKEN'], chariow:['CHARIOW_API_KEY','CHARIOW_WEBHOOK_SECRET'], flutterwave:['FLUTTERWAVE_SECRET_KEY','FLUTTERWAVE_WEBHOOK_SECRET'], moneroo:['MONEROO_API_KEY','MONEROO_WEBHOOK_SECRET'], paytech:['PAYTECH_API_KEY','PAYTECH_API_SECRET'], bictorys:['BICTORYS_API_KEY','BICTORYS_WEBHOOK_SECRET']
};
const betaProviders=new Set(['flutterwave','paytech','bictorys']);
if (!paymentsEnabled) add('payments-mode','Paiements','PASS','Désactivés par configuration — aucun provider requis pour ce SaaS','payments');
for(const p of enabledProviders){
  const req=providerVars[p]||[];
  const missing=req.filter(k=>!(env[k]||process.env[k]));
  const status=missing.length?'FAIL':betaProviders.has(p)?'WARN':'PASS';
  add(`provider-${p}`,`Paiement ${p}`,status,missing.length?`Variables manquantes: ${missing.join(', ')}`:betaProviders.has(p)?'Adaptateur bêta: sandbox/validation marchand requis avant live':'Configuration de base présente','payments');
}

add('webhooks','Routes webhooks',!paymentsEnabled?'PASS':exists('app/api/webhooks/[provider]/route.ts')?'PASS':'FAIL',!paymentsEnabled?'Non requises : paiements désactivés':'Les webhooks doivent être testés en sandbox et re-vérifier la transaction fournisseur','payments');
add('reconcile','Réconciliation paiements',!paymentsEnabled?'PASS':exists('lib/billing/reconcile.ts')&&exists('lib/billing/webhook.ts')?'PASS':'FAIL',!paymentsEnabled?'Non requise : paiements désactivés':'Réconciliation commune + idempotence requises avant fulfilment','payments');
add('security-audit','Audit sécurité',exists('scripts/security-audit.sh')?'PASS':'FAIL','Exécuter npm run security:audit avant production','security');
add('mobile-first','Mobile-first foundations',exists('scripts/mobile-first-check.mjs')&&exists('docs/mobile/mobile-first-delivery.md')?'PASS':'FAIL','Exécuter npm run mobile:check et valider visuellement les viewports avant production','design');
add('banani-plan','Plan implémentation Banani',exists('scripts/generate-implementation-plan.mjs')&&exists('design/banani/screens.json')?'PASS':'WARN','Après import des écrans: npm run design:plan','design');

const cspText = exists('lib/security/headers.ts') ? fs.readFileSync(path.join(root,'lib/security/headers.ts'),'utf8') : '';
add('csp-hardening','CSP sans unsafe-inline',cspText.includes("script-src 'self' 'unsafe-inline'")?'WARN':'PASS',cspText.includes("script-src 'self' 'unsafe-inline'")?'CSP compatible Next.js mais encore permissive: passer à des nonces avant niveau maximum':'script-src sans unsafe-inline détecté','security');

try {
  const pkg=readJSON('package.json');
  const latest=Object.entries({...pkg.dependencies,...pkg.devDependencies}).filter(([,v])=>v==='latest').map(([k])=>k);
  add('pinned-deps','Versions dépendances',latest.length?'WARN':'PASS',latest.length?`Versions "latest": ${latest.join(', ')}`:'Versions explicites','security');
} catch { add('package','package.json','FAIL','package.json illisible','core'); }

if (online) {
  const appUrl=(env.NEXT_PUBLIC_APP_URL||env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||'').replace(/\/$/,'');
  if(!appUrl) add('online-url','URL production','FAIL','APP_URL ou NEXT_PUBLIC_APP_URL requis pour --online','network');
  else {
    try {
      const u=new URL(appUrl);
      const addresses=await dns.resolve4(u.hostname).catch(()=>[]);
      add('dns','DNS',addresses.length?'PASS':'FAIL',addresses.length?`${u.hostname} → ${addresses.slice(0,3).join(', ')}`:'Aucun A record résolu','network');
      const r=await fetch(appUrl,{redirect:'manual'});
      const homeHtml=await r.text();
      add('https','HTTPS',u.protocol==='https:'?'PASS':'FAIL',u.protocol==='https:'?'URL HTTPS':'URL non HTTPS','network');
      const headers=['content-security-policy','x-content-type-options','strict-transport-security','referrer-policy'];
      const missing=headers.filter(h=>!r.headers.get(h));
      add('headers-online','Headers production',missing.length?'FAIL':'PASS',missing.length?`Manquants: ${missing.join(', ')}`:'Headers critiques présents','security');
      const seoMarkers=[['canonical','rel=\"canonical\"'],['og:image','property=\"og:image\"'],['og:title','property=\"og:title\"'],['description','name=\"description\"']];
      const missingSeo=seoMarkers.filter(([,marker])=>!homeHtml.includes(marker)).map(([name])=>name);
      add('seo-online','SEO metadata production',missingSeo.length?'FAIL':'PASS',missingSeo.length?`Métadonnées manquantes: ${missingSeo.join(', ')}`:'Canonical, description et Open Graph détectés','google');
      for(const endpoint of ['/robots.txt','/sitemap.xml']){
        const er=await fetch(appUrl+endpoint,{redirect:'follow'});
        add(`endpoint-${endpoint}`,endpoint,er.ok?'PASS':'WARN',`HTTP ${er.status}`,'google');
      }
    } catch(e){ add('online','Tests réseau','FAIL',e?.message||String(e),'network'); }
  }
}

try {
  execFileSync(process.execPath,['scripts/security-check.mjs'],{cwd:root,stdio:'ignore'});
  add('security-check','Security preflight','PASS','npm run security:check passe','security');
} catch { add('security-check','Security preflight','FAIL','npm run security:check échoue','security'); }

const weights={FAIL:0,WARN:0.5,PASS:1,UNVERIFIED:0.5};
const score=Math.round(100*results.reduce((a,r)=>a+weights[r.status],0)/Math.max(results.length,1));
const verdict=results.some(r=>r.status==='FAIL')?'NOT_READY':score>=90?'READY':'NEEDS_REVIEW';
const report={version:kitVersion,online,score,verdict,generatedAt:new Date().toISOString(),results};
fs.mkdirSync(path.join(root,'generated'),{recursive:true});
fs.writeFileSync(path.join(root,'generated/production-doctor.json'),JSON.stringify(report,null,2));

if(jsonMode) console.log(JSON.stringify(report,null,2));
else {
  console.log(`\nAfrica SaaS Kit — Production Doctor ${kitVersionLabel}`);
  console.log(`Score: ${score}/100 — ${verdict}\n`);
  for(const r of results) console.log(`${r.status.padEnd(4)}  ${r.label}: ${r.detail}`);
  console.log(`\nReport: generated/production-doctor.json`);
}
process.exit(results.some(r=>r.status==='FAIL')?2:0);
