import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=[
 "components/ui/skeleton.tsx","app/loading.tsx","app/dashboard/loading.tsx","app/admin/loading.tsx",
 "docs/ui/skeleton-loading.md"
];
let failed=false;
for(const file of required){const ok=fs.existsSync(path.join(root,file));console.log(`${ok?"✓":"✗"} ${file}`);if(!ok)failed=true;}
const agents=fs.readFileSync(path.join(root,"AGENTS.md"),"utf8");
for(const rule of ["Skeleton Loader Gate","loading.tsx","prefers-reduced-motion"]){const ok=agents.includes(rule);console.log(`${ok?"✓":"✗"} AGENTS: ${rule}`);if(!ok)failed=true;}
if(failed){console.error("Skeleton loading preflight: failed.");process.exit(1)}
console.log("Skeleton loading preflight: passed.");
