#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const approve = args.includes("--approve");
const protectedPreview = args.includes("--vercel-protected");
const val = (name) => {
  const arg = args.find((item) => item.startsWith(`--${name}=`));
  return arg?.slice(name.length + 3);
};
const url = (val("url") || process.env.STAGING_URL || "").replace(/\/$/, "");
if (!/^https:\/\//.test(url)) {
  console.error("Provide a HTTPS staging URL: npm run staging:test -- --url=https://...vercel.app");
  process.exit(1);
}

async function checkPublic(pathname) {
  try {
    const response = await fetch(url + pathname, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    return { path: pathname, ok: response.ok, status: response.status };
  } catch (error) {
    return { path: pathname, ok: false, status: 0, error: String(error?.message || error) };
  }
}

function checkProtected(pathname) {
  const outputFile = path.join(os.tmpdir(), `musikpro-staging-${process.pid}-${pathname.replaceAll("/", "-") || "root"}`);
  try {
    const command = spawnSync(
      "npx",
      [
        "--yes",
        "vercel@59.15.1",
        "curl",
        pathname,
        "--deployment",
        url,
        "--",
        "--silent",
        "--output",
        outputFile,
        "--write-out",
        "%{http_code}",
      ],
      { encoding: "utf8", timeout: 30000, env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" } },
    );
    const status = Number(command.stdout.trim().match(/(\d{3})\s*$/)?.[1] || 0);
    return { path: pathname, ok: command.status === 0 && status >= 200 && status < 300, status };
  } catch (error) {
    return { path: pathname, ok: false, status: 0, error: String(error?.message || error) };
  } finally {
    fs.rmSync(outputFile, { force: true });
  }
}

const checkPaths = ["/", "/api/health", "/api/readyz"];
const results = protectedPreview
  ? checkPaths.map(checkProtected)
  : await Promise.all(checkPaths.map(checkPublic));
const all = results.every((result) => result.ok);
let commit = null;
try {
  commit = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch {}
const report = {
  generatedAt: new Date().toISOString(),
  url,
  commit,
  protectedPreview,
  status: all ? "pass" : "fail",
  checks: results,
};
fs.mkdirSync(path.join(process.cwd(), "generated"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "generated/staging-test-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Staging tests: ${all ? "PASS" : "FAIL"} — ${url}`);
for (const result of results) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.path} ${result.status || "ERR"}`);
if (!all) process.exit(1);
if (approve) {
  fs.writeFileSync(
    path.join(process.cwd(), "generated/staging-approval.json"),
    `${JSON.stringify({ ...report, approvedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log("Staging APPROVED. Production gate can now pass for this Git commit.");
} else {
  console.log("Review auth, responsive UI, email, DB, business flows and optional payments, then run staging:approve with the same URL.");
}
