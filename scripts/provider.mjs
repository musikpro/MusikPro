import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const skills = JSON.parse(fs.readFileSync(path.join(cwd, "config/provider-skills.json"), "utf8"));
const providers = JSON.parse(fs.readFileSync(path.join(cwd, "config/providers.json"), "utf8"));
const arg = (process.argv[2] || "list").toLowerCase();

const skillLabel = (s) =>
  ({
    dedicated: "✅ dédié",
    shared: "🟢 partagé",
    "integration-doc-only": "🟡 documentation seulement",
    "adapter-only": "⚪ adaptateur seulement",
  })[s] || s;

if (arg === "list" || arg === "--list") {
  console.log("\nAfrica SaaS Kit — Provider Skills\n");
  console.log("Provider       Commande                 Skill                          Maturité");
  console.log("-------------  -----------------------  -----------------------------  -------------------");
  for (const [key, item] of Object.entries(skills)) {
    const maturity = providers[key]?.readiness ?? "inconnu";
    console.log(
      `${item.label.padEnd(13)}  ${item.call.padEnd(23)}  ${skillLabel(item.skillStatus).padEnd(29)}  ${maturity}`,
    );
  }
  console.log("\nDans Antigravity : /provider <nom>");
  console.log("Dans le terminal : npm run provider -- <nom>\n");
  process.exit(0);
}

const item = skills[arg];
if (!item) {
  console.error(`Provider inconnu: ${arg}`);
  console.error(`Disponibles: ${Object.keys(skills).join(", ")}`);
  process.exit(1);
}
const maturity = providers[arg]?.readiness ?? "inconnu";
console.log(`\n${item.label}`);
console.log(`Commande Antigravity : ${item.call}`);
console.log(`Skill : ${skillLabel(item.skillStatus)}`);
console.log(`Maturité adaptateur : ${maturity}`);
if (item.skill) console.log(`Skill file : ${item.skill}`);
for (const ref of item.references || []) console.log(`Reference : ${ref}`);
console.log(
  "\nDemande à l’Agent Antigravity d’exécuter la commande ci-dessus pour charger et expliquer les sources.\n",
);
