import fs from "node:fs";

const required = [
  "lib/seo/site.ts",
  "lib/seo/metadata.ts",
  "components/seo/json-ld.tsx",
  "app/opengraph-image.tsx",
  "app/twitter-image.tsx",
  "app/manifest.ts",
  "public/icon.svg",
  "app/apple-icon.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/(auth)/layout.tsx",
  "app/dashboard/layout.tsx",
  "app/admin/layout.tsx",
  "docs/seo/google-seo.md",
];

const errors = [];
for (const file of required) if (!fs.existsSync(file)) errors.push(`${file} missing`);

if (fs.existsSync("lib/seo/metadata.ts")) {
  const text = fs.readFileSync("lib/seo/metadata.ts", "utf8");
  for (const token of ["alternates", "canonical", "openGraph", "twitter", "summary_large_image", "noIndex"]) {
    if (!text.includes(token)) errors.push(`SEO metadata helper missing ${token}`);
  }
}

if (fs.existsSync("app/opengraph-image.tsx")) {
  const text = fs.readFileSync("app/opengraph-image.tsx", "utf8");
  if (!text.includes("1200") || !text.includes("630") || !text.includes("ImageResponse")) {
    errors.push("Open Graph image must be generated at 1200×630");
  }
}

for (const file of ["app/(auth)/layout.tsx", "app/dashboard/layout.tsx", "app/admin/layout.tsx"]) {
  if (fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes("privatePageMetadata")) {
    errors.push(`${file}: private routes must remain noindex`);
  }
}

if (fs.existsSync("app/robots.ts")) {
  const text = fs.readFileSync("app/robots.ts", "utf8");
  for (const route of ["/admin/", "/dashboard/", "/setup", "/api/"]) {
    if (!text.includes(route)) errors.push(`robots.ts must disallow ${route}`);
  }
}

if (fs.existsSync("AGENTS.md")) {
  const text = fs.readFileSync("AGENTS.md", "utf8");
  if (!text.includes("SEO Gate") || !text.includes("npm run seo:check")) errors.push("AGENTS.md SEO Gate missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("SEO preflight: passed.");
