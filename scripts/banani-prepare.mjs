import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, ".codex");
const file = path.join(dir, "config.toml");

fs.mkdirSync(dir, { recursive: true });

if (fs.existsSync(file)) {
  const size = fs.statSync(file).size;
  console.log(`✓ .codex/config.toml already exists (${size} byte${size === 1 ? "" : "s"}).`);
  console.log("  Existing content was NOT modified.");
} else {
  fs.writeFileSync(file, "", { mode: 0o600 });
  console.log("✓ Created empty .codex/config.toml");
}

try { fs.chmodSync(file, 0o600); } catch {}

console.log("\nNext:");
console.log("1. Open .codex/config.toml");
console.log("2. Paste the Banani MCP configuration from your own Banani account");
console.log("3. Do not paste the token into chat or Git");
console.log("4. Run: npm run banani:check");
