#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  '.agents/skills/setup-saas/SKILL.md',
  '.agents/skills/security-saas/SKILL.md',
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
];

const failures = [];
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

const dashboardPath = path.join(root, 'components/setup-saas-dashboard.tsx');
if (fs.existsSync(dashboardPath)) {
  const dashboard = fs.readFileSync(dashboardPath, 'utf8');
  if (!/Application Android & iPhone/.test(dashboard) || !/WebView connectée au SaaS/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — mobile WebView readiness section missing');
  if (!/\/security-saas/.test(dashboard) || !/Audit sécurité du SaaS/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — /security-saas dashboard section missing');
  if (!/npm run kit:verify/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — kit:verify command missing from dashboard');
  if (!/npm run first-run/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — first-run command missing from dashboard');
  if (!/Staging Vercel — obligatoire avant Production/.test(dashboard) || !/staging:approve/.test(dashboard)) failures.push('components/setup-saas-dashboard.tsx — mandatory staging section missing');
}


if (failures.length) {
  console.error('Kit integrity: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Kit integrity: PASS — ${requiredFiles.length} critical files verified.`);
console.log('Critical skills: .agents/skills/setup-saas/SKILL.md + .agents/skills/security-saas/SKILL.md');
