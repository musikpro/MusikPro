#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();
const checks=[];
const read=p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
const css=read('app/globals.css');const layout=read('app/layout.tsx');const agents=read('AGENTS.md');const planner=read('scripts/generate-implementation-plan.mjs');
function add(id,ok,detail){checks.push({id,status:ok?'PASS':'FAIL',detail});}
add('mobile-css',/mobile-bottom-nav/.test(css)&&/@media\(min-width:768px\)/.test(css),'Navigation mobile dédiée + breakpoint desktop');
add('safe-area',/safe-area-inset-bottom/.test(css),'Gestion de la safe area iPhone/Android');
add('touch-target',/min-height:44px/.test(css)||/min-height:48px/.test(css),'Cibles tactiles minimales');
add('responsive-table',/table-wrap/.test(css),'Wrapper de tableaux pour petits écrans');
add('viewport',/export const viewport/.test(layout),'Viewport explicite Next.js');
add('agent-mobile-gate',/Mobile-First/.test(agents)&&/360/.test(agents),'Instructions IA mobile-first');
add('planner-mobile-gate',/Gate Mobile/.test(planner),'Gate mobile dans le planificateur');
const failed=checks.filter(c=>c.status==='FAIL');
console.log('Africa SaaS Kit — Mobile First Check');
for(const c of checks)console.log(`${c.status==='PASS'?'✓':'✗'} ${c.id}: ${c.detail}`);
if(failed.length){console.error(`\n${failed.length} contrôle(s) mobile FAIL.`);process.exit(1);}else console.log('\nMobile-first preflight: passed.');
