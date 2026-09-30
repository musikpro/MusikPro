#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const timeoutMs = 12000;
const registryResult = spawnSync("npm", ["config", "get", "registry"], { encoding: "utf8" });
const registry = (registryResult.stdout || "https://registry.npmjs.org/").trim() || "https://registry.npmjs.org/";

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  const response = await fetch(registry, { method: "HEAD", signal: controller.signal, redirect: "follow" });
  if (!response.ok && response.status >= 500) throw new Error(`HTTP ${response.status}`);
  console.log(`npm registry: PASS — ${registry}`);
} catch (error) {
  console.error(`npm registry: FAIL — ${registry}`);
  console.error(
    `Impossible de joindre le registre npm (${error?.name === "AbortError" ? "délai dépassé" : error?.message || "erreur réseau"}).`,
  );
  console.error("Vérifiez Internet/DNS/proxy, puis testez : npm ping");
  console.error("Le kit n'a pas été modifié et aucune dépendance partielle n'est considérée comme installée.");
  process.exit(1);
} finally {
  clearTimeout(timer);
}
