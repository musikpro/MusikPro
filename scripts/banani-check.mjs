#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const configFile = path.join(root, "africa-saas.config.json");
const projectMcp = path.join(root, ".mcp.json");
const claudeFile = path.join(os.homedir(), ".claude.json");
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
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function sameProject(a, b) {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}
function localBananiServer() {
  const data = readJson(claudeFile);
  const projects = data?.projects && typeof data.projects === "object" ? data.projects : {};
  for (const [projectPath, projectConfig] of Object.entries(projects)) {
    if (!sameProject(projectPath, root)) continue;
    const server = projectConfig?.mcpServers?.banani;
    if (server && typeof server === "object") return server;
  }
  return null;
}

const config = readJson(configFile);
const requested = config?.banani === true;
const explicitlyDisabled = config?.banani === false;

// Official workflow: local Claude Code scope only. Do not commit the Banani token in project MCP files.
if (fs.existsSync(projectMcp)) {
  const data = readJson(projectMcp);
  if (data?.mcpServers?.banani) {
    // MusikPro : `.mcp.json` est ignoré par Git. Un fichier suivi par Git expose le token (bloquant) ; un fichier
    // local ignoré reste toléré (avertissement) pour ne pas casser une connexion Banani déjà en place.
    const tracked = spawnSync("git", ["ls-files", "--error-unmatch", ".mcp.json"], { cwd: root, stdio: "ignore" });
    if (tracked.status === 0)
      fail("Banani est présent dans .mcp.json SUIVI par Git : retire-le de l'index et révoque le token.");
    else
      warn(
        "Banani est présent dans .mcp.json (ignoré par Git). Préfère le scope local : claude mcp add --scope local.",
      );
  }
}

const server = localBananiServer();
if (!server) {
  if (requested)
    fail(
      "Banani est activé mais aucune connexion locale Claude Code n'a été trouvée dans ~/.claude.json pour ce projet. Exécute npm run banani:prepare.",
    );
  else
    warn(
      `Banani MCP: SKIPPED — connexion Claude Code locale absente${explicitlyDisabled ? " et module désactivé" : " avant choix dans /setup-saas"}.`,
    );
} else {
  const url = typeof server.url === "string" ? server.url : "";
  let secureUrl = false;
  if (!url) fail("Banani Claude Code: URL MCP manquante");
  else {
    try {
      const parsed = new URL(url);
      secureUrl = parsed.protocol === "https:";
      if (!secureUrl) fail("Banani MCP doit utiliser HTTPS");
      if (parsed.hostname !== "app.banani.co") fail("Banani MCP doit utiliser l'hôte officiel app.banani.co");
    } catch {
      fail("Banani Claude Code: URL MCP invalide");
    }
  }
  const typeOk = server.type === "http" || server.type == null;
  if (!typeOk) fail("Banani Claude Code doit utiliser le transport HTTP");
  const headers = server.headers && typeof server.headers === "object" ? server.headers : {};
  const auth =
    typeof headers.Authorization === "string"
      ? headers.Authorization
      : typeof headers.authorization === "string"
        ? headers.authorization
        : "";
  const hasAuth =
    /^Bearer\s+\S+/i.test(auth) || (typeof server.headersHelper === "string" && server.headersHelper.trim().length > 0);
  if (!hasAuth) fail("Banani Claude Code: authentification Bearer/headersHelper manquante");
  configured = secureUrl && typeOk && hasAuth && !failed;
  if (configured) pass("Banani MCP configuré dans Claude Code (scope local, token non affiché)");
}

if (failed) process.exit(1);
if (!configured) {
  console.log("Banani MCP preflight: SKIPPED (Claude Code uniquement / optionnel / non configuré)");
  process.exit(0);
}
console.log("Banani MCP preflight: CONFIGURED_IN_CLAUDE_CODE");
