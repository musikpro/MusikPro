#!/usr/bin/env node
const base = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const checks = [
  { path: '/api/health', expect: [200], name: 'health' },
  { path: '/api/readyz', expect: [200], name: 'readyz' },
  { path: '/robots.txt', expect: [200], name: 'robots' },
  { path: '/sitemap.xml', expect: [200], name: 'sitemap' },
  { path: '/api/auth/get-session', expect: [200], name: 'better-auth surface' }
];
let failed = 0;
console.log(`Smoke target: ${base}`);
for (const check of checks) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${base}${check.path}`, { redirect: 'manual', signal: controller.signal, headers: { 'user-agent': 'africa-saas-kit-smoke/1' } });
    const ok = check.expect.includes(response.status);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name}  ${check.path} -> ${response.status}`);
    if (!ok) failed++;
  } catch (error) {
    failed++;
    console.log(`FAIL  ${check.name}  ${check.path} -> ${error instanceof Error ? error.message : 'network error'}`);
  } finally {
    clearTimeout(timer);
  }
}
if (failed) process.exit(1);
console.log('System smoke: PASS');
