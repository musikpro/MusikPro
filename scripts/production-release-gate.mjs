#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path"; import { execSync, spawnSync } from "node:child_process";
const deploy=process.argv.includes("--deploy"); const file=path.join(process.cwd(),"generated/staging-approval.json");
if(!fs.existsSync(file)){console.error("Production BLOCKED: no staging approval. Run staging:deploy, staging:test and staging:approve first.");process.exit(1)}
let a; try{a=JSON.parse(fs.readFileSync(file,"utf8"))}catch{console.error("Production BLOCKED: invalid staging approval report.");process.exit(1)}
if(a.status!=="pass"||!/^https:\/\//.test(a.url||"")){console.error("Production BLOCKED: staging approval is not valid.");process.exit(1)}
let head=null; try{head=execSync("git rev-parse HEAD",{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()}catch{}
if(head&&a.commit&&head!==a.commit){console.error("Production BLOCKED: code changed after staging approval. Re-run staging for the current commit.");process.exit(1)}
console.log(`Production gate: PASS — staging approved at ${a.url}`);
if(!deploy) process.exit(0);
console.log("Deploying to Vercel Production only after staging approval...");
const r=spawnSync(process.platform==="win32"?"npx.cmd":"npx",["vercel","--prod"],{stdio:"inherit"}); process.exit(r.status??1);
