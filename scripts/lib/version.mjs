import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(here, "../../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

export const kitVersion = String(pkg.version || "0.0.0");
export const kitVersionLabel = `V${kitVersion}`;
