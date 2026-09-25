#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  '.agents/skills/setup-saas/SKILL.md',
  '.agents/skills/security-saas/SKILL.md',
  '.agents/skills/claude-code/SKILL.md',
  '.agents/skills/computer-use-claude/SKILL.md',
  'AGENTS.md',
  'README.md',
  'SECURITY.md',
  'DESIGN.md',
  'docs/setup-saas.md',
  'package.json',
  'africa-saas.config.example.json',
  'docs/mobile/mobile-app-pipeline.md',
  'scripts/mobile-app-check.mjs',
  'scripts/dependency-install-check.mjs',
  'scripts/kit-doctor.mjs',
  'scripts/kit-audit.mjs',
  'scripts/kit-verify.mjs',
  'scripts/full-integrity-check.mjs',
  'scripts/first-run.mjs',
  'scripts/security-saas.mjs',
  'lib/security/security-saas-report.ts',
  'prisma/schema.prisma',
  'app/api/clients/route.ts',
  'app/api/clients/[id]/route.ts',
  'scripts/clients-crud-check.mjs',
  'scripts/prisma-clients.mjs',
  'docs/features/clients-crud.md',
  'config/staging.json',
  'scripts/staging-check.mjs',
  'scripts/staging-test.mjs',
  'scripts/production-release-gate.mjs',
  'docs/deployment/staging-vercel.md',
  'docs/production-state-owner-dashboard.md',
  'app/admin/production-doctor/page.tsx',
  'app/admin/production-doctor/loading.tsx',
  'app/admin/layout.tsx',
  'CLAUDE.md',
  '.claude/settings.json',
  '.claude/commands/setup-saas.md',
  '.claude/commands/security-saas.md',
  '.claude/commands/import-banani.md',
  '.claude/commands/computer-use-claude.md',
  '.claude/commands/claude-code.md',
  'scripts/claude-code-check.mjs',
  'scripts/computer-use-claude-check.mjs',
  'scripts/computer-use-claude-mark.mjs',
];

const failures = [];

const frenchInstructionFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/README.md',
  '.codex/README.md',
];
for (const rel of frenchInstructionFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  if (!/toujours répondre[^\n]*français/i.test(content)) {
    failures.push(`${rel} — règle de réponse en français absente`);
  }
}

const refactorInstructionFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/README.md',
  '.codex/README.md',
];
for (const rel of refactorInstructionFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, 'utf8');
  if (!/refactorisation[^\n]*(propre|professionnelle)/i.test(content) || !/(non régressive|préserver les fonctionnalités existantes)/i.test(content)) {
    failures.push(`${rel} — règle de refactorisation propre/non régressive absente`);
  }
}

const skillsRoot = path.join(root, '.agents/skills');
if (fs.existsSync(skillsRoot)) {
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(skillsRoot, entry.name, 'SKILL.md');
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (!/Langue de réponse/i.test(content) || !/français/i.test(content)) {
      failures.push(`.agents/skills/${entry.name}/SKILL.md — règle de langue française absente`);
    }
    if (!/Règle de refactorisation/i.test(content) || !/refactorisation[^\n]*(propre|professionnelle)/i.test(content)) {
      failures.push(`.agents/skills/${entry.name}/SKILL.md — règle de refactorisation non régressive absente`);
    }
  }
}
for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel} — missing`);
    continue;
  }
  const stat = fs.statSync(abs);
  if (!stat.isFile() || stat.size === 0) failures.push(`${rel} — empty or invalid`);
}

const skillPath = path.join(root, '.agents/skills/setup-saas/SKILL.md');
if (fs.existsSync(skillPath)) {
  const text = fs.readFileSync(skillPath, 'utf8');
  if (!/^name:\s*setup-saas\s*$/m.test(text)) failures.push('.agents/skills/setup-saas/SKILL.md — invalid skill metadata');
  if (!/\/setup-saas/.test(text)) failures.push('.agents/skills/setup-saas/SKILL.md — setup-saas instructions missing');
  if (!/WebView/i.test(text) || !/Phase 21/.test(text)) failures.push('.agents/skills/setup-saas/SKILL.md — Phase 21 WebView guidance missing');
  if (!/CRUD Clients/i.test(text) || !/post-Banani/i.test(text)) failures.push('.agents/skills/setup-saas/SKILL.md — post-Banani CRUD Clients guidance missing');
  if (!/Staging Gate obligatoire/i.test(text) || !/staging:approve/.test(text)) failures.push('.agents/skills/setup-saas/SKILL.md — mandatory staging guidance missing');
}


const securitySkillPath = path.join(root, '.agents/skills/security-saas/SKILL.md');
if (fs.existsSync(securitySkillPath)) {
  const text = fs.readFileSync(securitySkillPath, 'utf8');
  if (!/^name:\s*security-saas\s*$/m.test(text)) failures.push('.agents/skills/security-saas/SKILL.md — invalid skill metadata');
  if (!/\/security-saas/.test(text) || !/Zod/i.test(text) || !/RLS/i.test(text)) failures.push('.agents/skills/security-saas/SKILL.md — security audit guidance incomplete');
}

const adminLayoutPath = path.join(root, 'app/admin/layout.tsx');
const adminShellPath = path.join(root, 'components/admin/AdminShell.tsx');
const productionStatePagePath = path.join(root, 'app/admin/production-doctor/page.tsx');
if (fs.existsSync(productionStatePagePath)) {
  // MusikPro's owner nav lives in components/admin/AdminShell.tsx (rendered from
  // app/admin/layout.tsx), not inline in layout.tsx like the generic starter — check both.
  const adminNavText = [adminLayoutPath, adminShellPath]
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n');
  const productionStatePage = fs.readFileSync(productionStatePagePath, 'utf8');
  if (!/href[:=]\s*["']\/admin\/production-doctor["']/.test(adminNavText) || !/État production/.test(adminNavText)) {
    failures.push('app/admin/layout.tsx (ou components/admin/AdminShell.tsx) — menu propriétaire « État production » absent');
  }
  if (!/État production/.test(productionStatePage) || !/rapport CLI reste la source de vérité/i.test(productionStatePage)) {
    failures.push('app/admin/production-doctor/page.tsx — écran État production incomplet');
  }
}

const dashboardPath = path.join(root, 'components/setup-saas-dashboard.tsx');
if (fs.existsSync(dashboardPath)) {
  const dashboard = fs.readFileSync(dashboardPath, 'utf8');
  if (!/Application Android & iPhone/.test(dashboard) || !/WebView connectée au SaaS/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — mobile WebView readiness section missing');
  if (!/\/security-saas/.test(dashboard) || !/Audit sécurité du SaaS/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — /security-saas dashboard section missing');
  if (!/npm run kit:verify/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — kit:verify command missing from dashboard');
  if (!/npm run kit:full-test/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — kit:full-test command missing from dashboard');
  if (!/npm run first-run/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — first-run command missing from dashboard');
  if (!/Staging Vercel — obligatoire avant Production/.test(dashboard) || !/staging:approve/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — mandatory staging section missing');
  if (!/Agents IA & Computer Use/.test(dashboard) || !/computer-use:claude:check/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — Claude Code / Computer Use readiness section missing');
}


if (failures.length) {
  console.error('Kit integrity: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Kit integrity: PASS — ${requiredFiles.length} critical files verified.`);
console.log('Critical skills: .agents/skills/setup-saas/SKILL.md + .agents/skills/security-saas/SKILL.md');
