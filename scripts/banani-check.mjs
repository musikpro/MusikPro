import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const file = path.join(root, ".codex", "config.toml");
const gitignore = path.join(root, ".gitignore");
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
  fail(".codex/config.toml is missing. Run: npm run banani:prepare");
} else {
  pass(".codex/config.toml exists");
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) {
    fail("Banani MCP is not configured yet. Open .codex/config.toml and paste your own Banani MCP configuration.");
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
console.log("Banani MCP preflight: CONFIGURED");
