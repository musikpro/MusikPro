import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function parseVersion(value) {
  const match = String(value || "").trim().match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

export function versionAtLeast(actual, minimum) {
  const a = parseVersion(actual);
  const b = parseVersion(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

export function readRuntimeContract() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const engine = String(pkg.engines?.node || "").trim();
  const minMatch = engine.match(/^>=\s*(\d+\.\d+\.\d+)$/);
  const minimumNodeVersion = minMatch?.[1] || null;
  return {
    engine,
    minimumNodeVersion,
    currentNodeVersion: process.versions.node,
    currentNodeOk: minimumNodeVersion ? versionAtLeast(process.versions.node, minimumNodeVersion) : false,
  };
}
