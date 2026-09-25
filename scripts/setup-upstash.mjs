#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const none = process.argv.includes("--none");
const cfgPath = path.join(root, "africa-saas.config.json");
const outDir = path.join(root, "generated");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "upstash-setup.md");

function readCfg() {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
}
function writeEnabled(value) {
  const cfg = readCfg();
  if (!cfg) throw new Error("Missing africa-saas.config.json. Run npm run setup first.");
  cfg.upstashEnabled = value;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
}

if (none) {
  writeEnabled(false);
  fs.writeFileSync(out, "# Upstash — non utilisé\n\nCe SaaS utilisera Neon directement. Upstash reste optionnel.\n");
  console.log("✓ Upstash skipped. Neon remains the source of truth.");
  console.log('Next: npm run setup-saas:mark -- --phase=16 --status=skipped --note="Upstash non utilisé"');
  process.exit(0);
}

writeEnabled(true);
fs.writeFileSync(
  out,
  `# Upstash Redis — configuration optionnelle\n\n## Rôle\nUpstash Redis sert de couche rapide pour le **cache avec TTL**, le **rate limiting distribué** et les **états temporaires**. Neon reste la source de vérité métier.\n\n## Étapes\n1. Crée/ouvre une base Redis dans Upstash Console.\n2. Récupère **REST URL** et **REST TOKEN**.\n3. Ajoute-les directement dans \`.env.local\` :\n\n\`\`\`env\nUPSTASH_REDIS_REST_URL=\nUPSTASH_REDIS_REST_TOKEN=\n\`\`\`\n\nNe colle jamais le token dans le chat et ne le commit jamais dans Git.\n\n## Bon usage\n- cache de lectures fréquentes et recalculables ;\n- compteurs/rate limits ;\n- états temporaires et verrous courts ;\n- toujours utiliser un TTL pour les clés de cache.\n\n## À ne pas faire\n- ne pas remplacer Neon pour les données métier critiques ;\n- ne pas conserver une information essentielle uniquement dans le cache ;\n- ne pas mettre le REST TOKEN dans une variable NEXT_PUBLIC_.\n\n## Validation\n\`npm run upstash:check\`\n\`npm run upstash:check:online\`\nPuis vérifier \`/api/readyz\`.\n`,
);
console.log(`✓ Guide generated: ${path.relative(root, out)}`);
console.log("Add REST URL + token directly to .env.local, then run npm run upstash:check:online.");
