#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--") && a.includes("="))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=")];
    }),
);
const status = args.status || "verified";
if (!["verified", "unverified", "skipped"].includes(status))
  throw new Error("Use --status=verified|unverified|skipped");
if (status === "verified" && !String(args.evidence || "").trim())
  throw new Error("A verified status requires --evidence describing the real Claude Code browser/computer test.");
const dir = path.join(process.cwd(), ".africa-saas");
fs.mkdirSync(dir, { recursive: true });
const payload = {
  version: kitVersion,
  status,
  platform: "claude-code",
  evidence: status === "verified" ? String(args.evidence).slice(0, 500) : String(args.evidence || ""),
  verifiedAt: status === "verified" ? new Date().toISOString() : null,
};
fs.writeFileSync(path.join(dir, "computer-use-claude.json"), JSON.stringify(payload, null, 2));
console.log(`Claude Code Computer Use status: ${status.toUpperCase()}`);
console.log("State stored locally in .africa-saas/computer-use-claude.json (ignored by Git).");
