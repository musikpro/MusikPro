#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const args=process.argv.slice(2); const approve=args.includes("--approve");
const val=(name)=>{const a=args.find(x=>x.startsWith(`--${name}=`)); return a?.slice(name.length+3)};
const url=(val("url")||process.env.STAGING_URL||"").replace(/\/$/,"");
if(!/^https:\/\//.test(url)){console.error("Provide a HTTPS staging URL: npm run staging:test -- --url=https://...vercel.app");process.exit(1)}
const checks=["/","/api/health","/api/readyz"]; const results=[];
for(const p of checks){try{const r=await fetch(url+p,{redirect:"follow",signal:AbortSignal.timeout(12000)}); results.push({path:p,ok:r.ok,status:r.status});}catch(e){results.push({path:p,ok:false,status:0,error:String(e?.message||e)})}}
const all=results.every(x=>x.ok); let commit=null; try{commit=execSync("git rev-parse HEAD",{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()}catch{}
const report={generatedAt:new Date().toISOString(),url,commit,status:all?"pass":"fail",checks:results};
fs.mkdirSync(path.join(process.cwd(),"generated"),{recursive:true}); fs.writeFileSync(path.join(process.cwd(),"generated/staging-test-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(`Staging tests: ${all?"PASS":"FAIL"} — ${url}`); for(const x of results) console.log(`${x.ok?"PASS":"FAIL"} ${x.path} ${x.status||"ERR"}`);
if(!all) process.exit(1);
if(approve){fs.writeFileSync(path.join(process.cwd(),"generated/staging-approval.json"),JSON.stringify({...report,approvedAt:new Date().toISOString()},null,2)+"\n"); console.log("Staging APPROVED. Production gate can now pass for this Git commit.")}
else console.log("Review auth, responsive UI, email, DB, business flows and optional payments, then run staging:approve with the same URL.");
