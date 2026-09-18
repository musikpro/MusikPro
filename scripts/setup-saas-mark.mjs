#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { kitVersion } from "./lib/version.mjs";

const root = process.cwd();
const dir = path.join(root, ".africa-saas");
const file = path.join(dir, "setup-progress.json");
const args = Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith("--") && a.includes("=")).map(a=>{const [k,...v]=a.slice(2).split("=");return [k,v.join("=")];}));
const phase = Number(args.phase);
const status = args.status || "passed";
const note = args.note || "Validé après contrôle réel par l’agent/utilisateur.";
if (!Number.isInteger(phase) || phase < 1 || phase > 21) throw new Error("Use --phase=1..21");
if (!["passed","skipped","reset"].includes(status)) throw new Error("Use --status=passed|skipped|reset");
let data = { version: kitVersion, phases: {} };
try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
data.version = kitVersion;
data.phases ||= {};
if (status === "reset") delete data.phases[String(phase)];
else data.phases[String(phase)] = { status, note, validatedAt: new Date().toISOString() };
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(status === "reset" ? `Phase ${phase} reset.` : status === "skipped" ? `Phase ${phase} skipped (optional).` : `Phase ${phase} marked passed.`);
console.log("Progress file: .africa-saas/setup-progress.json");
