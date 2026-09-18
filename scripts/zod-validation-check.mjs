import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const cfg=JSON.parse(fs.readFileSync(path.join(root,"config/zod-validation.json"),"utf8"));
const failures=[]; let serverActions=0, apiRoutes=0, clientForms=0;
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const walk=(dir)=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p]}):[];
const rel=f=>path.relative(root,f).replaceAll("\\","/");
const hasZod=s=>/from\s+["']zod["']|@\/lib\/validation\//.test(s);
const hasParse=s=>cfg.server.acceptedMarkers.some(m=>s.includes(m));

for(const f of walk(path.join(root,"app"))){
  if(!/\.(ts|tsx)$/.test(f)) continue;
  const r=rel(f), s=fs.readFileSync(f,"utf8");
  if(s.includes('"use server"')||s.includes("'use server'")){
    serverActions++;
    if(!hasZod(s)||!hasParse(s)) failures.push(`${r}: Server Action sans validation Zod (.parse/.safeParse).`);
    if(r.startsWith("app/admin/") && !s.includes("requireAdmin")) failures.push(`${r}: Server Action admin sans requireAdmin().`);
    if(r.startsWith("app/dashboard/") && !s.includes("requireUser") && !s.includes("requireAdmin")) failures.push(`${r}: Server Action dashboard sans garde d’authentification serveur.`);
  }
  if(r.startsWith("app/api/")&&r.endsWith("/route.ts")){
    const mutating=/export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b|export\s+const\s+(POST|PUT|PATCH|DELETE)\b/.test(s);
    if(!mutating) continue; apiRoutes++;
    if(cfg.server.exemptions[r]) continue;
    if(!hasZod(s)||!hasParse(s)) failures.push(`${r}: route mutante sans validation Zod serveur ou exemption explicite.`);
  }
}
for(const f of walk(path.join(root,"components"))){
  if(!/\.tsx$/.test(f)) continue;
  const r=rel(f), s=fs.readFileSync(f,"utf8");
  if(s.includes("authClient.")&&s.includes("<form")){
    clientForms++;
    if(!hasZod(s)||!s.includes("safeParse(")) failures.push(`${r}: formulaire client auth sans safeParse Zod avant envoi.`);
  }
}
if(failures.length){console.error("ZOD VALIDATION GATE — FAIL\n"+failures.map(x=>`- ${x}`).join("\n"));process.exit(1);}
console.log(`ZOD VALIDATION GATE — PASS — ${serverActions} fichiers Server Action, ${apiRoutes} routes API mutantes, ${clientForms} formulaires client auth contrôlés.`);
