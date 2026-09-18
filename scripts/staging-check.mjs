#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); const fail=[]; const warn=[];
const need=["config/staging.json","docs/deployment/staging-vercel.md","scripts/staging-test.mjs","scripts/production-release-gate.mjs"];
for(const f of need) if(!fs.existsSync(path.join(root,f))) fail.push(`missing ${f}`);
let c={}; try{c=JSON.parse(fs.readFileSync(path.join(root,"config/staging.json"),"utf8"))}catch{fail.push("config/staging.json invalid JSON")}
if(c.requiredBeforeProduction!==true) fail.push("requiredBeforeProduction must be true");
if(c.provider!=="vercel-preview") fail.push("provider must be vercel-preview");
const approval=path.join(root,"generated/staging-approval.json");
if(!fs.existsSync(approval)) warn.push("staging not approved yet — run staging:test then staging:approve");
console.log(fail.length?"Staging gate: FAIL":"Staging gate: PASS");
for(const x of fail) console.error(`- ${x}`); for(const x of warn) console.log(`- WARN ${x}`);
if(fail.length) process.exit(1);
