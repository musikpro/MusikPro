#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const args=new Set(process.argv.slice(2));
const port=Number(process.env.PORT||3000);
const localBase=`http://127.0.0.1:${port}`;
const providers=['fedapay','paydunya','chariow','flutterwave','moneroo','paytech','bictorys','djomy','stripe'];
const configPath=path.join(root,'africa-saas.config.json');
let config={providers:[],defaultProvider:null};
if(fs.existsSync(configPath)){
  try{config=JSON.parse(fs.readFileSync(configPath,'utf8'));}catch{}
}

function commandExists(name){
  try{execFileSync(name,['version'],{stdio:'ignore'});return true;}catch{return false;}
}
async function isReachable(url){
  try{const r=await fetch(url,{redirect:'manual'});return r.status>0;}catch{return false;}
}

function upsertEnvLocal(key,value){
  const envPath=path.join(root,'.env.local');
  let text=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
  const line=`${key}=${value}`;
  const re=new RegExp(`^${key}=.*$`,'m');
  text=re.test(text)?text.replace(re,line):`${text}${text.endsWith('\n')||!text?'':'\n'}${line}\n`;
  fs.writeFileSync(envPath,text);
}

async function getNgrokUrl(){
  try{
    const r=await fetch('http://127.0.0.1:4040/api/tunnels');
    if(!r.ok)return null;
    const data=await r.json();
    const tunnel=(data.tunnels||[]).find(t=>String(t.public_url||'').startsWith('https://'))||(data.tunnels||[])[0];
    return tunnel?.public_url?.replace(/\/$/,'')||null;
  }catch{return null;}
}

const ngrokInstalled=commandExists('ngrok');
const appRunning=await isReachable(localBase);
const publicUrl=await getNgrokUrl();
const enabled=Array.isArray(config.providers)?config.providers:[];
if(!enabled.length){
  fs.mkdirSync(path.join(root,'generated'),{recursive:true});
  fs.writeFileSync(path.join(root,'generated/local-payment-lab.md'),'# Local Payment Lab\n\nPaiements désactivés : aucun provider n’est configuré. Ce test est optionnel pour ce SaaS.\n');
  fs.writeFileSync(path.join(root,'generated/local-payment-lab.json'),JSON.stringify({generatedAt:new Date().toISOString(),paymentsEnabled:false,enabledProviders:[]},null,2));
  console.log('Payments are disabled / optional. No Local Payment Lab is required.');
  process.exit(0);
}
if(publicUrl && args.has('--write-env')) upsertEnvLocal('PAYMENT_WEBHOOK_BASE_URL',publicUrl);
const webhookUrls=publicUrl?Object.fromEntries(enabled.map(p=>[p,`${publicUrl}/api/webhooks/${p}`])):{};
const report={generatedAt:new Date().toISOString(),port,localBase,ngrokInstalled,appRunning,publicUrl,enabledProviders:enabled,defaultProvider:config.defaultProvider||null,webhookUrls};
fs.mkdirSync(path.join(root,'generated'),{recursive:true});
fs.writeFileSync(path.join(root,'generated/local-payment-lab.json'),JSON.stringify(report,null,2));
const lines=[
'# Local Payment Lab', '',
`- App locale: ${appRunning?'PASS':'FAIL'} — ${localBase}`,
`- ngrok installé: ${ngrokInstalled?'PASS':'FAIL'}`,
`- Tunnel HTTPS: ${publicUrl?`PASS — ${publicUrl}`:'FAIL — aucun tunnel ngrok détecté'}`,'',
'## Webhooks à copier dans les dashboards sandbox','',
...(publicUrl?enabled.map(p=>`- ${p}: \`${webhookUrls[p]}\``):['Démarre d’abord `ngrok http '+port+'`, puis relance `npm run payments:local`.']),
'',
'## Règle de sécurité','',
'ngrok expose le serveur local mais ne valide pas le paiement. Chaque webhook doit toujours passer par la signature/IPN du fournisseur, une relecture API fournisseur et l’idempotence avant fulfillment.',
'',
'## Étapes suivantes','',
'1. Démarrer `npm run dev` dans le terminal A.',
'2. Démarrer `ngrok http '+port+'` dans le terminal B.',
'3. Relancer `npm run payments:local`.',
'4. Copier l’URL webhook du provider dans son dashboard sandbox.',
'5. Lancer un vrai checkout sandbox depuis `/dashboard/billing`.',
'6. Finir l’autorisation Mobile Money/carte sur le provider sandbox.',
'7. Vérifier `payment = paid`, fulfillment unique et abonnement/crédits.',
'8. Rejouer le webhook dans l’inspecteur ngrok et vérifier qu’aucun double crédit n’apparaît.',
'9. Tester succès, annulation, échec, retard et webhook dupliqué.',
];
fs.writeFileSync(path.join(root,'generated/local-payment-lab.md'),lines.join('\n'));

console.log(`\nAfrica SaaS Kit — Local Payment Lab\n`);
console.log(`${appRunning?'✓':'✗'} Next.js: ${localBase}`);
console.log(`${ngrokInstalled?'✓':'✗'} ngrok CLI`);
console.log(`${publicUrl?'✓':'✗'} Tunnel: ${publicUrl||'non détecté'}`);
if(publicUrl){
 console.log('\nWebhook URLs:');
 for(const p of enabled) console.log(`  ${p.padEnd(12)} ${webhookUrls[p]}`);
}
console.log('\nRapport: generated/local-payment-lab.md');
if(publicUrl) console.log(`Env webhook: PAYMENT_WEBHOOK_BASE_URL=${publicUrl}${args.has('--write-env')?' (écrit dans .env.local)':''}`);
if(!ngrokInstalled){console.log('\nAction: installe ngrok puis configure ton authtoken.');process.exitCode=1;}
else if(!appRunning||!publicUrl){console.log(`\nAction: terminal A -> npm run dev ; terminal B -> ngrok http ${port}`);process.exitCode=1;}
else if(args.has('--write-env')) console.log('\nRedémarre npm run dev pour prendre en compte PAYMENT_WEBHOOK_BASE_URL.');
