import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "prisma/schema.prisma",
  "lib/prisma.ts",
  "lib/validation/clients.ts",
  "lib/clients/repository.ts",
  "app/api/clients/route.ts",
  "app/api/clients/[id]/route.ts",
  "prisma/migrations/20260912000000_clients_crud/migration.sql",
  "docs/features/clients-crud.md",
];
let failed = false;
for (const file of required) {
  const ok = fs.existsSync(path.join(root, file));
  console.log(`${ok ? "PASS" : "FAIL"} ${file}`);
  if (!ok) failed = true;
}
const imported = fs.existsSync(path.join(root, "design/banani/imported-design.json"));
console.log(`${imported ? "PASS" : "WAIT"} Banani import prerequisite`);
if (!imported) console.log("CRUD Clients is present in the kit but must only be attached to UI after /import-banani.");
if (!imported && process.argv.includes("--require-banani")) {
  console.error("STOP: import Banani first with /import-banani, then rerun clients:crud:setup.");
  failed = true;
}

const collection = fs.readFileSync(path.join(root, "app/api/clients/route.ts"), "utf8");
const item = fs.readFileSync(path.join(root, "app/api/clients/[id]/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "prisma/migrations/20260912000000_clients_crud/migration.sql"), "utf8");
for (const [label, ok] of [
  ["Zod server validation", collection.includes("clientCreateSchema.safeParse") && item.includes("clientUpdateSchema.safeParse")],
  ["Better Auth session", collection.includes("auth.api.getSession") && item.includes("auth.api.getSession")],
  ["Rate limiting", collection.includes("rateLimit(") && item.includes("rateLimit(")],
  ["Mutation request guards", collection.includes("rejectCrossSiteMutation") && item.includes("rejectCrossSiteMutation")],
  ["RLS enabled", migration.includes("ENABLE ROW LEVEL SECURITY") && migration.includes("client_owner_policy")],
]) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
