import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const file = path.join(root, ".codex", "config.toml");
const gitignore = path.join(root, ".gitignore");
const configFile = path.join(root, "africa-saas.config.json");
const config = (() => {
  try {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch {
    return null;
  }
})();
const requested = config?.banani === true;
const explicitlyDisabled = config?.banani === false;
let failed = false;
let configured = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`✓ ${msg}`);
}
function warn(msg) {
  console.log(`⚠ ${msg}`);
}

if (!fs.existsSync(file)) {
  if (requested) fail("Banani est activé dans africa-saas.config.json mais .codex/config.toml manque. Lancez: npm run banani:prepare");
  else warn("Banani MCP: SKIPPED — module non configuré à ce stade. Lancez npm run banani:prepare seulement si vous souhaitez l’utiliser.");
} else {
  pass(".codex/config.toml exists");
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) {
    if (requested) fail("Banani est activé mais le fichier MCP est vide. Collez votre configuration Banani dans .codex/config.toml.");
    else warn(`Banani MCP: SKIPPED — configuration vide${explicitlyDisabled ? " et module désactivé" : " avant choix dans /setup-saas"}.`);
  } else {
    const hasServer = /\[\s*mcp_servers\.banani\s*\]/i.test(text);
    const urlMatch = text.match(/^\s*url\s*=\s*["']([^"']+)["']/im);
    const hasUrl = Boolean(urlMatch);
    const hasAuth = /Authorization/i.test(text) && /Bearer\s+[^"'\s}]+/i.test(text);
    let secureUrl = false;
    if (urlMatch) {
      try {
        const parsed = new URL(urlMatch[1]);
        secureUrl = parsed.protocol === "https:";
        if (!secureUrl) fail("Banani MCP url must use HTTPS");
        else if (parsed.hostname !== "app.banani.co")
          warn("Banani MCP host is not app.banani.co; verify this endpoint came from Banani before using it");
      } catch {
        fail("Banani MCP url is invalid");
      }
    }
    if (!hasServer) fail("Banani MCP section [mcp_servers.banani] not found");
    if (!hasUrl) fail("Banani MCP url is missing");
    if (!hasAuth) fail("Banani Authorization bearer token is missing");
    configured = hasServer && hasUrl && secureUrl && hasAuth;
    if (configured) pass("Banani MCP configuration shape is present (token value not displayed)");
  }
}

if (!fs.existsSync(gitignore)) fail(".gitignore is missing");
else {
  const gi = fs.readFileSync(gitignore, "utf8");
  if (/(^|\n)\.codex\/config\.toml\s*(\n|$)/.test(gi) || /(^|\n)\.codex\/\s*(\n|$)/.test(gi)) {
    pass(".codex/config.toml is covered by .gitignore");
  } else fail(".codex/config.toml is NOT ignored by Git");
}

try {
  const tracked = execFileSync("git", ["ls-files", "--error-unmatch", ".codex/config.toml"], {
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
  if (tracked)
    fail(".codex/config.toml is already tracked by Git. Remove it from the index and rotate any exposed token.");
} catch {
  pass(".codex/config.toml is not tracked by Git (or repository not initialized yet)");
}

if (failed) process.exit(1);
if (!configured) {
  console.log("Banani MCP preflight: SKIPPED (optional / not configured yet)");
  process.exit(0);
}
console.log("Banani MCP preflight: CONFIGURED");
