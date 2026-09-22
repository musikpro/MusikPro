#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=process.cwd();
const stateFile=path.join(root,'.africa-saas/computer-use-claude.json');
let state=null; try { state=JSON.parse(fs.readFileSync(stateFile,'utf8')); } catch {}
const cli=spawnSync('claude',['--version'],{encoding:'utf8',timeout:1800});
const cliDetected=cli.status===0;
const projectReady=fs.existsSync(path.join(root,'CLAUDE.md')) && fs.existsSync(path.join(root,'.claude/settings.json'));
const verified=state?.status==='verified';
console.log('Africa SaaS Kit — Computer Use / Browser — Claude Code');
console.log(`- Claude Code projet: ${projectReady ? 'PASS' : 'FAIL'}`);
console.log(`- CLI claude: ${cliDetected ? 'détecté' : 'non détecté dans ce shell'}`);
console.log(`- Test Computer Use/Browser: ${verified ? 'VERIFIED' : 'UNVERIFIED'}`);
if(verified){ console.log(`- Preuve: ${String(state.evidence||'test réel confirmé').slice(0,180)}`); console.log(`- Vérifié le: ${state.verifiedAt||'date inconnue'}`); process.exit(0); }
console.log('\nPour obtenir le voyant vert:');
console.log('1. Ouvrir Claude Code dans ce projet.');
console.log('2. Utiliser son outil navigateur/computer use disponible, ou un MCP navigateur autorisé, pour ouvrir une page et vérifier visuellement son contenu.');
console.log('3. Après succès réel seulement:');
console.log('   npm run computer-use:claude:mark -- --status=verified --evidence="page ouverte et vérifiée avec Claude Code"');
process.exitCode=2;
