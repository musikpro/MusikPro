import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (p, fallback={}) => { try { return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); } catch { return fallback; } };
const readEnv = (p) => {
  const out = {};
  try {
    for (const raw of fs.readFileSync(path.join(root,p),'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 1) continue;
      let value = line.slice(i+1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
      out[line.slice(0,i).trim()] = value;
    }
  } catch {}
  return out;
};

const env = readEnv('.env.local');
const example = readEnv('.env.example');
const deployment = readJson('config/deployment-env.json', {groups:[],reserved:[]});
const providers = readJson('config/providers.json', {});
const appCfg = readJson('africa-saas.config.json', {});
const selected = Array.isArray(appCfg.providers) ? appCfg.providers : [];
const paymentsEnabled = appCfg.paymentsEnabled === true || selected.length > 0;
const base = '<TON-DOMAINE-HTTPS>';
const configured = (name) => Boolean(env[name] && env[name].trim());
const cloudinaryEnabled = appCfg.cloudinaryEnabled === true || ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].some(configured);
const upstashEnabled = appCfg.upstashEnabled === true || ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'].some(configured);

const providerRows = [];
for (const [id,p] of Object.entries(providers)) {
  const enabled = selected.includes(id);
  if (!enabled) continue;
  const names = p.env || [];
  providerRows.push({id,label:p.label||id,readiness:p.readiness||'unknown',enabled,env:names.map(name=>({name,configured:configured(name)})),webhook:`${base}/api/webhooks/${id}`});
}

const visibleGroups = deployment.groups.filter(group => (paymentsEnabled || group.id !== "payments-core") && (cloudinaryEnabled || group.id !== "cloudinary"));
const variableRows = visibleGroups.flatMap(group => group.variables.filter(v => (paymentsEnabled || !["PAYMENT_WEBHOOK_BASE_URL","PAYMENT_DEFAULT_PROVIDER","CRON_SECRET"].includes(v.name)) && (upstashEnabled || !["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"].includes(v.name))).map(v => ({...v,group:group.label,configured:configured(v.name)})));
const missing = variableRows.filter(v => ['always','production-security'].includes(v.required) && !v.configured);

const md = [];
md.push('# Deployment Handoff — Africa SaaS Kit');
md.push('');
md.push('> Ce rapport ne révèle jamais les valeurs secrètes. Il indique uniquement les noms, l’état CONFIGURÉ/MANQUANT, l’endroit où récupérer la valeur et où la renseigner.');
md.push('');
md.push('## 1. GitHub — Gate dépôt');
md.push('- [ ] Le dépôt GitHub est privé au minimum pendant la configuration initiale.');
md.push('- [ ] `.env*` contenant de vraies valeurs n’est pas commité.');
md.push('- [ ] Le vrai `package-lock.json` est commité après `npm install`.');
md.push('- [ ] La branche principale est protégée et les checks CI passent.');
md.push('- [ ] Aucun secret ne se trouve dans l’historique Git.');
md.push('');
md.push('## 2. Vercel — Variables d’environnement');
for (const group of visibleGroups) {
  md.push(`### ${group.label}`);
  md.push('| Variable | État local | Secret ? | Vercel | Obligatoire quand | Où obtenir / quoi mettre |');
  md.push('|---|---|---:|---|---|---|');
  for (const v of group.variables.filter(v => (paymentsEnabled || !["PAYMENT_WEBHOOK_BASE_URL","PAYMENT_DEFAULT_PROVIDER","CRON_SECRET"].includes(v.name)) && (upstashEnabled || !["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"].includes(v.name)))) {
    md.push(`| \`${v.name}\` | ${configured(v.name)?'✅ CONFIGURÉE':'❌ MANQUANTE'} | ${v.sensitive?'Oui':'Non'} | ${(v.vercel||[]).join(' + ')} | ${v.required} | ${v.source} |`);
  }
  md.push('');
}
md.push('### Variables réservées / non câblées');
md.push('Ne pas les considérer comme actives tant que leur intégration n’est pas réellement codée :');
for (const name of deployment.reserved || []) md.push(`- \`${name}\``);
md.push('');
md.push('## 3. Paiements — clés et webhooks');
if (!providerRows.length) md.push('Aucun provider sélectionné. C’est valide : ce SaaS est configuré sans paiements.');
for (const p of providerRows) {
  md.push(`### ${p.label} — ${p.readiness}`);
  md.push(`Webhook production : \`${p.webhook}\``);
  for (const e of p.env) md.push(`- ${e.configured?'✅':'❌'} \`${e.name}\` — ${e.configured?'configurée localement':'à renseigner'}`);
  md.push('- [ ] Configurer cette URL webhook dans le dashboard du fournisseur.');
  md.push('- [ ] Tester en sandbox avant de passer les clés live.');
  md.push('- [ ] Vérifier signature/IPN + relecture fournisseur + idempotence.');
  md.push('');
}
md.push('## 4. Cloudinary — uploads d’images');
md.push(cloudinaryEnabled ? 'Cloudinary est activé : ajouter ses variables dans Vercel et effectuer un upload réel en staging.' : 'Cloudinary n’est pas activé. C’est valide pour un SaaS sans upload d’images.');
md.push('');
md.push('## 5. URLs externes à enregistrer après choix du domaine');
md.push(`- Google OAuth callback : \`${base}/api/auth/callback/google\``);
if (paymentsEnabled) md.push(`- Cron réconciliation : \`${base}/api/cron/reconcile-payments\``);
md.push(`- Sitemap : \`${base}/sitemap.xml\``);
md.push(`- Robots : \`${base}/robots.txt\``);
md.push('- Search Console : ajouter la propriété Domain, vérifier DNS, puis soumettre `/sitemap.xml`.');
md.push('');
md.push('## 6. Ordre de mise en ligne — l’IA doit guider pas à pas');
md.push('1. **Gate GitHub** — repo, lockfile, sécurité Git, CI.');
md.push('2. **Gate Vercel Project** — importer le repo sans encore annoncer la production prête.');
md.push('3. **Gate Staging obligatoire** — créer une Vercel Preview, tester `staging:test`, puis approuver avec `staging:approve`.');
md.push('4. **Gate Production** — `deploy:production:check` doit passer pour le commit courant avant tout déploiement final.');
md.push('5. **Gate Domain** — connecter le domaine final et attendre HTTPS valide.');
md.push('6. **Gate Environment** — renseigner les variables Vercel groupe par groupe.');
md.push('7. **Gate Database** — appliquer les migrations Neon sur la base de production et vérifier.');
md.push('8. **Gate OAuth/Email** — callback Google, domaine Resend, email de test.');
md.push(paymentsEnabled ? '9. **Gate Payments** — URLs webhook du domaine final + clés production seulement après sandbox validé.' : '7. **Gate Payments** — ignoré : aucun paiement activé pour ce SaaS.');
md.push(paymentsEnabled ? '10. **Gate Cron** — exécuter `npm run cron:generate`, configurer `CRON_SECRET`, puis valider la réconciliation sur Vercel.' : '8. **Gate Cron paiement** — ignoré : paiements désactivés.');
md.push('11. **Gate SEO** — Search Console, sitemap, canonical, social preview.');
md.push('12. **Gate Final** — `npm run verify:production` puis `npm run doctor:production:online`.');
md.push('');
md.push('## 7. Règles de sécurité pendant le handoff');
md.push('- L’IA ne demande jamais à l’utilisateur de coller une clé secrète dans le chat.');
md.push('- L’IA indique où récupérer la clé et laisse l’utilisateur la saisir directement dans Vercel/son terminal.');
md.push('- Les variables `NEXT_PUBLIC_*` sont publiques par définition : aucune clé secrète ne doit porter ce préfixe.');
md.push('- Ne jamais copier l’URL ngrok dans la configuration production.');
md.push('- Les clés sandbox/test et live doivent rester séparées.');
md.push('');
md.push(`## 8. Résumé automatique`);
md.push(`- Variables suivies : **${variableRows.length}**`);
md.push(`- Variables de base critiques manquantes localement : **${missing.length}**`);
md.push(`- Providers listés : **${providerRows.length}**`);
md.push('- Statut production réel : **NON VÉRIFIÉ** tant que les gates dynamiques ne sont pas passés.');

fs.mkdirSync(path.join(root,'generated'), {recursive:true});
fs.writeFileSync(path.join(root,'generated/deployment-handoff.md'), md.join('\n')+'\n');
fs.writeFileSync(path.join(root,'generated/deployment-handoff.json'), JSON.stringify({generatedAt:new Date().toISOString(), variables:variableRows.map(v=>({name:v.name,group:v.group,configured:v.configured,sensitive:v.sensitive,vercel:v.vercel,required:v.required})),providers:providerRows,externalUrls:{googleOAuth:`${base}/api/auth/callback/google`,cron:paymentsEnabled?`${base}/api/cron/reconcile-payments`:null,sitemap:`${base}/sitemap.xml`}},null,2));
console.log('Deployment handoff generated:');
console.log('  generated/deployment-handoff.md');
console.log('  generated/deployment-handoff.json');
console.log(`Critical missing variables (local check): ${missing.length}`);
console.log('No secret values were written to the report.');
