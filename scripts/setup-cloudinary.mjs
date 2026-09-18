#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const none = process.argv.includes("--none");
const outDir = path.join(root, "generated");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "cloudinary-setup.md");
const cfgFile = path.join(root, "africa-saas.config.json");
const readCfg = () => { try { return JSON.parse(fs.readFileSync(cfgFile, "utf8")); } catch { return null; } };
const writeCfg = (enabled) => { const cfg = readCfg(); if (!cfg) return; cfg.cloudinaryEnabled = enabled; fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 }); };

if (none) {
  writeCfg(false);
  fs.writeFileSync(out, `# Cloudinary — non utilisé\n\nCe SaaS n'utilise pas Cloudinary. La phase peut être marquée SKIPPED.\n`);
  console.log("✓ Cloudinary skipped. No image-upload provider is required.");
  console.log("Next: npm run setup-saas:mark -- --phase=19 --status=skipped --note=\"Cloudinary non utilisé\"");
  process.exit(0);
}

writeCfg(true);
fs.writeFileSync(out, `# Cloudinary — configuration optionnelle\n\nCloudinary n'est requis que si le SaaS a besoin d'uploads d'images.\n\n## 1. Créer le compte\n1. Ouvre le dashboard Cloudinary et crée/choisis un cloud.\n2. Récupère **Cloud name**, **API Key** et **API Secret** depuis les paramètres API.\n3. Ne colle jamais l'API Secret dans le chat.\n\n## 2. Variables locales\nAjoute directement dans \`.env.local\` :\n\n\`\`\`env\nCLOUDINARY_CLOUD_NAME=\nCLOUDINARY_API_KEY=\nCLOUDINARY_API_SECRET=\nCLOUDINARY_FOLDER=africa-saas-kit\n\`\`\`\n\n## 3. Sécurité du kit\n- uploads authentifiés uniquement par défaut ;\n- JPEG/PNG/WebP/AVIF/GIF uniquement ;\n- SVG refusé par défaut ;\n- taille maximale 10 MB ;\n- API secret uniquement côté serveur ;\n- fichiers rangés par utilisateur ;\n- ne jamais accepter une URL de ressource envoyée par le client comme preuve de propriété.\n\n## 4. Tester localement\n1. Lance \`npm run dev\`.\n2. Connecte un utilisateur de test du SaaS.\n3. Envoie un formulaire multipart vers \`POST /api/uploads/images\` avec le champ \`file\`.\n4. Vérifie que la réponse contient \`publicId\` et une URL HTTPS Cloudinary.\n5. Vérifie dans Cloudinary que l'image est bien rangée sous le dossier configuré.\n6. Teste aussi : fichier >10 MB, SVG, fichier non-image et requête sans session — ils doivent être refusés.\n\n## 5. Vercel\nSi le test local passe, ajoute en **Production** (et Preview seulement si nécessaire) :\n- \`CLOUDINARY_CLOUD_NAME\`\n- \`CLOUDINARY_API_KEY\`\n- \`CLOUDINARY_API_SECRET\`\n- \`CLOUDINARY_FOLDER\` (optionnel)\n\nPuis refais un upload en staging avant production.\n`);
console.log(`✓ Guide generated: ${path.relative(root, out)}`);
console.log("Cloudinary remains optional until a real upload test succeeds.");
