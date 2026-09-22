#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const generatedDir = path.join(root, 'generated');
const checks = [
  ['integrity', 'Intégrité des fichiers critiques', ['node', ['scripts/kit-integrity-check.mjs']]],
  ['version', 'Cohérence de version', ['node', ['scripts/version-check.mjs']]],
  ['features', 'Inventaire des fonctionnalités/routes', ['node', ['scripts/feature-inventory.mjs']]],
  ['clients-crud', 'CRUD Clients post-Banani', ['node', ['scripts/clients-crud-check.mjs']]],
  ['security-baseline', 'Security Baseline', ['node', ['scripts/security-baseline-check.mjs']]],
  ['zod', 'Validation Zod client/serveur', ['node', ['scripts/zod-validation-check.mjs']]],
  ['refactor', 'Continuous Refactor Gate', ['node', ['scripts/general-refactor-check.mjs']]],
  ['dependency-floors', 'Versions minimales sensibles', ['node', ['scripts/dependency-security-floor.mjs']]],
  ['security', 'Security preflight', ['node', ['scripts/security-check.mjs']]],
  ['env', 'Contrat des variables environnement', ['node', ['scripts/env-contract-check.mjs']]],
  ['runtime', 'Runtime des routes', ['node', ['scripts/runtime-check.mjs']]],
  ['web-mobile', 'Responsive Web / mobile-first', ['node', ['scripts/mobile-first-check.mjs']]],
  ['mobile-app', 'Pipeline Mobile WebView', ['node', ['scripts/mobile-app-check.mjs']]],
  ['icons', 'Premium Icon Gate', ['node', ['scripts/premium-icon-check.mjs']]],
  ['loading', 'Skeleton/loading states', ['node', ['scripts/loading-check.mjs']]],
  ['hydration', 'Hydration guards', ['node', ['scripts/hydration-check.mjs']]],
  ['seo', 'SEO', ['node', ['scripts/seo-check.mjs']]],
  ['deployment', 'Deployment handoff', ['node', ['scripts/deployment-check.mjs']]],
  ['conformity', 'Conformité structurelle globale', ['node', ['scripts/conformity-check.mjs']]],
  ['claude-code', 'Compatibilité Claude Code', ['node', ['scripts/claude-code-check.mjs']]],
  ['format-hygiene', 'Hygiène de format', ['node', ['scripts/format-check.mjs']]],
];

function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: process.env });
  return {
    status: r.status === 0 ? 'pass' : 'fail',
    exitCode: r.status ?? 1,
    output: `${r.stdout || ''}${r.stderr || ''}`.trim().slice(0, 8000),
  };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'out', 'coverage'].includes(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out); else out.push(abs);
  }
  return out;
}

const results = [];
for (const [id, label, [cmd, args]] of checks) {
  const r = run(cmd, args);
  results.push({ id, label, ...r });
  console.log(`${r.status === 'pass' ? '✓' : '✗'} ${label}`);
}

// Syntax: every local JS/MJS script should parse without executing.
const scriptFiles = walk(path.join(root, 'scripts')).filter((f) => /\.(?:mjs|js)$/.test(f));
let syntaxFailure = null;
for (const file of scriptFiles) {
  const r = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) { syntaxFailure = `${path.relative(root, file)}\n${r.stderr || r.stdout}`; break; }
}
results.push({ id: 'script-syntax', label: `Syntaxe Node (${scriptFiles.length} scripts)`, status: syntaxFailure ? 'fail' : 'pass', exitCode: syntaxFailure ? 1 : 0, output: syntaxFailure || 'Tous les scripts Node se parsèment correctement.' });
console.log(`${syntaxFailure ? '✗' : '✓'} Syntaxe Node (${scriptFiles.length} scripts)`);

// Shell syntax: keep maintenance/security scripts executable after refactors.
const shellFiles = walk(path.join(root, 'scripts')).filter((f) => f.endsWith('.sh'));
const shellFailures = [];
for (const file of shellFiles) {
  const r = spawnSync('bash', ['-n', file], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) shellFailures.push(`${path.relative(root, file)}\n${r.stderr || r.stdout}`);
}
results.push({ id: 'shell-syntax', label: `Syntaxe Shell (${shellFiles.length} scripts)`, status: shellFailures.length ? 'fail' : 'pass', exitCode: shellFailures.length ? 1 : 0, output: shellFailures.join('\n') || 'Tous les scripts shell se parsèment correctement.' });
console.log(`${shellFailures.length ? '✗' : '✓'} Syntaxe Shell (${shellFiles.length} scripts)`);

// Detect unresolved merge markers anywhere in project-owned text files.
const conflictFiles = [];
for (const file of walk(root)) {
  if (file.includes(`${path.sep}generated${path.sep}`)) continue;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (/^(?:<{7}|={7}|>{7})(?:\s|$)/m.test(text)) conflictFiles.push(path.relative(root, file));
}
results.push({ id: 'merge-markers', label: 'Marqueurs de conflit Git', status: conflictFiles.length ? 'fail' : 'pass', exitCode: conflictFiles.length ? 1 : 0, output: conflictFiles.join('\n') || 'Aucun marqueur de conflit Git non résolu.' });
console.log(`${conflictFiles.length ? '✗' : '✓'} Marqueurs de conflit Git`);

// JSON validity across project-owned JSON files.
const jsonFiles = walk(root).filter((f) => f.endsWith('.json') && !f.includes(`${path.sep}generated${path.sep}`));
const invalidJson = [];
for (const file of jsonFiles) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { invalidJson.push(`${path.relative(root, file)}: ${e.message}`); }
}
results.push({ id: 'json', label: `JSON valides (${jsonFiles.length} fichiers)`, status: invalidJson.length ? 'fail' : 'pass', exitCode: invalidJson.length ? 1 : 0, output: invalidJson.join('\n') || 'Tous les JSON sont valides.' });
console.log(`${invalidJson.length ? '✗' : '✓'} JSON valides (${jsonFiles.length} fichiers)`);

// Local imports: catch files moved/deleted during refactors before TypeScript is installed.
const sourceFiles = walk(root).filter((f) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.includes(`${path.sep}generated${path.sep}`));
const missingImports = [];
const importPattern = /(?:from\s*["']|import\s*(?:\(\s*)?["']|require\(\s*["'])(@\/[^"']+|\.{1,2}\/[^"']+)/g;
const importExts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.svg'];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(importPattern)) {
    const spec = match[1];
    const base = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const candidates = [
      ...importExts.map((ext) => `${base}${ext}`),
      ...importExts.filter(Boolean).map((ext) => path.join(base, `index${ext}`)),
    ];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) missingImports.push(`${path.relative(root, file)} -> ${spec}`);
  }
}
results.push({ id: 'local-imports', label: `Imports locaux (${sourceFiles.length} fichiers source)`, status: missingImports.length ? 'fail' : 'pass', exitCode: missingImports.length ? 1 : 0, output: missingImports.join('\n') || 'Tous les imports locaux contrôlés pointent vers une cible existante.' });
console.log(`${missingImports.length ? '✗' : '✓'} Imports locaux (${sourceFiles.length} fichiers source)`);

// Guided first-run helper must remain wired without executing recursively from kit:audit.
const firstRunFile = path.join(root, 'scripts/first-run.mjs');
const firstRunPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const firstRunOk = fs.existsSync(firstRunFile) && firstRunPkg.scripts?.['first-run'] === 'node scripts/first-run.mjs' && firstRunPkg.scripts?.['first-run:install'] === 'node scripts/first-run.mjs --install';
results.push({ id: 'first-run', label: 'Premier démarrage guidé', status: firstRunOk ? 'pass' : 'fail', exitCode: firstRunOk ? 0 : 1, output: firstRunOk ? 'first-run et first-run:install sont câblés.' : 'Commande de premier démarrage absente ou incohérente.' });
console.log(`${firstRunOk ? '✓' : '✗'} Premier démarrage guidé`);

// npm scripts that explicitly invoke a local scripts/* file must point to an existing file.
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const missingTargets = [];
for (const [name, value] of Object.entries(pkg.scripts || {})) {
  for (const match of String(value).matchAll(/(?:node|bash)\s+(scripts\/[^\s&;]+)/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) missingTargets.push(`${name} -> ${match[1]}`);
  }
}
results.push({ id: 'script-targets', label: 'Cibles des scripts npm', status: missingTargets.length ? 'fail' : 'pass', exitCode: missingTargets.length ? 1 : 0, output: missingTargets.join('\n') || 'Aucune cible locale manquante.' });
console.log(`${missingTargets.length ? '✗' : '✓'} Cibles des scripts npm`);

const warnings = [];
if (!fs.existsSync(path.join(root, 'package-lock.json'))) warnings.push('package-lock.json absent : lancez npm install avant certification production.');
if (!fs.existsSync(path.join(root, 'node_modules'))) warnings.push('node_modules absent : lint/typecheck/tests/build/npm audit dynamiques non exécutés par cet audit statique.');

const failed = results.filter((r) => r.status === 'fail');
const passed = results.filter((r) => r.status === 'pass');
const status = failed.length ? 'FAIL' : 'PASS';
const score = Math.round((passed.length / results.length) * 100);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status,
  score,
  summary: { pass: passed.length, fail: failed.length, warn: warnings.length, total: results.length },
  warnings,
  results,
};

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, 'kit-audit-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# Africa SaaS Kit — Audit intégrité',
  '',
  `**Statut : ${status}**`,
  `**Score : ${score}%**`,
  `**PASS : ${passed.length} · WARN : ${warnings.length} · FAIL : ${failed.length}**`,
  '',
  '## Contrôles',
  ...results.map((r) => `- ${r.status === 'pass' ? '✅' : '❌'} ${r.label}`),
  '',
  '## Avertissements',
  ...(warnings.length ? warnings.map((w) => `- ⚠️ ${w}`) : ['- ✅ Aucun']),
  '',
  '> Cet audit est volontairement exécutable sans dépendances. Après `npm install`, lancez aussi `npm run verify:code` puis `npm run verify:production` avant mise en production.',
  '',
].join('\n');
fs.writeFileSync(path.join(generatedDir, 'kit-audit-report.md'), md);

console.log(`\nKit audit: ${status} — ${score}% (${passed.length}/${results.length} contrôles)`);
for (const w of warnings) console.log(`○ ${w}`);
console.log('Rapports: generated/kit-audit-report.md + generated/kit-audit-report.json');
process.exit(failed.length ? 1 : 0);
