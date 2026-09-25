import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const designMd = path.join(root, "DESIGN.md");
const bananiDir = path.join(root, "design", "banani", "screens");
let failed = false;

if (!fs.existsSync(designMd)) {
  console.error("✗ DESIGN.md manquant");
  failed = true;
} else {
  const text = fs.readFileSync(designMd, "utf8");
  console.log(text.length > 200 ? "✓ DESIGN.md présent" : "⚠ DESIGN.md très court");
}

if (!fs.existsSync(bananiDir)) {
  console.error("✗ design/banani/screens manquant");
  failed = true;
} else console.log(`✓ dossier Banani prêt (${fs.readdirSync(bananiDir).length} fichier(s))`);

if (failed) process.exit(1);
console.log("Design handoff check: passed");
