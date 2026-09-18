import fs from "node:fs";

const file = "app/layout.tsx";
const src = fs.readFileSync(file, "utf8");
const errors = [];

if (!src.includes("<body suppressHydrationWarning>")) {
  errors.push("app/layout.tsx doit appliquer suppressHydrationWarning sur <body>.");
}

// Keep the escape hatch narrow: do not suppress hydration warnings on the entire html tree.
if (/<html[^>]*suppressHydrationWarning/.test(src)) {
  errors.push("Ne pas appliquer suppressHydrationWarning sur <html>; garder la tolérance limitée au body.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Hydration guard preflight: PASS");
