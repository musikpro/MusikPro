import { asc, desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { paymentAttempts, paymentCountryRoutes, paymentProviderConfigs, planProviderMappings, plans } from "@/db/schema";
import { providerCapabilities } from "@/lib/payments/capabilities";
import { saveCountryRoute, savePlanMapping, saveProvider } from "./actions";

export default async function PaymentProvidersPage(){
 const since=new Date(Date.now()-24*60*60*1000);
 const [configs,routes,allPlans,mappings,attempts]=await Promise.all([
  db.select().from(paymentProviderConfigs).orderBy(asc(paymentProviderConfigs.priority)),
  db.select().from(paymentCountryRoutes).orderBy(asc(paymentCountryRoutes.country),asc(paymentCountryRoutes.priority)),
  db.select().from(plans).orderBy(asc(plans.name)), db.select().from(planProviderMappings),
  db.select().from(paymentAttempts).where(gte(paymentAttempts.createdAt,since)).orderBy(desc(paymentAttempts.createdAt)).limit(500)
 ]);
 const configMap=new Map(configs.map(x=>[x.provider,x])); const mapKey=new Map(mappings.map(x=>[`${x.planId}:${x.provider}`,x]));
 const health=Object.keys(providerCapabilities).map(provider=>{const a=attempts.filter(x=>x.provider===provider&&["checkout_created","provider_error"].includes(x.outcome));const ok=a.filter(x=>x.outcome==="checkout_created").length;return {provider,total:a.length,success:ok,rate:a.length?Math.round(ok/a.length*100):null};});
 return <main><h1>Passerelles de paiement Afrique — Smart Router</h1><p>Priorité configurée + santé des dernières 24 h. Les secrets restent exclusivement dans les variables d’environnement.</p>
 <h2>Santé (24 h)</h2><table><thead><tr><th>Provider</th><th>Tentatives</th><th>Succès checkout</th><th>Taux</th></tr></thead><tbody>{health.map(h=><tr key={h.provider}><td>{h.provider}</td><td>{h.total}</td><td>{h.success}</td><td>{h.rate===null?"—":`${h.rate}%`}</td></tr>)}</tbody></table>
 <h2>Passerelles</h2>{Object.entries(providerCapabilities).map(([provider,cap])=>{const c=configMap.get(provider);const blocked=["scaffold","merchant-validation"].includes(cap.readiness);return <form action={saveProvider} key={provider} style={{border:"1px solid #ddd",padding:12,marginBottom:10}}><input type="hidden" name="provider" value={provider}/><strong>{provider}</strong> — {cap.readiness} — {cap.note}<br/><span>Méthodes: {cap.methods.join(", ")}</span><br/><label><input type="checkbox" name="enabled" defaultChecked={c?.enabled} disabled={blocked}/> activé</label> <input name="priority" type="number" defaultValue={c?.priority??100} min="1" max="999"/> <select name="mode" defaultValue={c?.mode??"sandbox"}><option>sandbox</option><option>live</option></select> <button>Enregistrer</button></form>})}
 <h2>Routage par pays/opérateur</h2><form action={saveCountryRoute}><input name="country" placeholder="CI" maxLength={2}/><select name="provider">{Object.entries(providerCapabilities).filter(([,c])=>!["scaffold","merchant-validation"].includes(c.readiness)).map(([pr])=><option key={pr}>{pr}</option>)}</select><input name="priority" type="number" defaultValue="100"/><input name="methods" placeholder="wave,orange_money,mtn"/><input name="currencies" placeholder="XOF,USD"/><label><input name="enabled" type="checkbox" defaultChecked/> actif</label><button>Ajouter / modifier</button></form>
 <ul>{routes.map(r=><li key={r.id}>{r.country} → {r.provider} (priorité {r.priority}) devises: {Array.isArray(r.currencies)?r.currencies.join(", "):"toutes"} méthodes: {Array.isArray(r.methods)?r.methods.join(", "):"toutes"} {r.enabled?"✓":"désactivé"}</li>)}</ul>
 <h2>Mapping plans → produits Chariow</h2>{allPlans.map(plan=><form action={savePlanMapping} key={plan.id}><input type="hidden" name="planId" value={plan.id}/><input type="hidden" name="provider" value="chariow"/><strong>{plan.name}</strong> <input name="externalProductId" placeholder="prd_..." defaultValue={mapKey.get(`${plan.id}:chariow`)?.externalProductId??""}/><button>Enregistrer</button></form>)}
 </main>
}
