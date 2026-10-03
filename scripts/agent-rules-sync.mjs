#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// Variante MusikPro du script du kit 0.11.7 : le kit réécrit CLAUDE.md en entier ; ici seul le bloc miroir
// est régénéré. Les règles propres au projet (langue, i18n, toast, onglets…) restent intactes.
const root = process.cwd();
const agentsPath = path.join(root, "AGENTS.md");
const claudePath = path.join(root, "CLAUDE.md");
const start = "<!-- AGENTS_MIRROR_START -->";
const end = "<!-- AGENTS_MIRROR_END -->";

if (!fs.existsSync(agentsPath)) {
  console.error("Agent rules sync: FAIL — AGENTS.md manquant");
  process.exit(1);
}
const agents = fs.readFileSync(agentsPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
const block = `${start}\n${agents}\n${end}`;
const existing = fs.existsSync(claudePath) ? fs.readFileSync(claudePath, "utf8").replace(/\r\n/g, "\n") : "";

const startIndex = existing.indexOf(start);
const endIndex = existing.indexOf(end);
let content;
if (startIndex >= 0 && endIndex > startIndex) {
  content = existing.slice(0, startIndex) + block + existing.slice(endIndex + end.length);
} else {
  const section = `## Synchronisation obligatoire avec AGENTS.md

- **Aucune règle générale présente dans \`AGENTS.md\` ne peut manquer dans \`CLAUDE.md\`.**
- Le bloc ci-dessous est un miroir intégral de \`AGENTS.md\`; il doit rester strictement synchronisé. Ne pas le modifier à la main.
- Après toute modification de \`AGENTS.md\`, exécuter \`npm run agents:rules-sync\` puis \`npm run agents:rules-check\`.
- Les règles propres à ce projet, écrites hors du bloc miroir, priment en cas de doute et ne doivent jamais être affaiblies par lui.

${block}
`;
  content = `${existing.trimEnd()}\n\n${section}`;
}
fs.writeFileSync(claudePath, content.endsWith("\n") ? content : `${content}\n`);
console.log("Agent rules sync: PASS — bloc miroir de CLAUDE.md synchronisé depuis AGENTS.md.");
