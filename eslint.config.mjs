import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { i18nClientFiles, i18nClientTextSelectors } from "./eslint/i18n-client-text.mjs";

export default defineConfig([
  ...fixupConfigRules([...nextVitals, ...nextTs]),
  {
    files: i18nClientFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["warn", ...i18nClientTextSelectors] },
  },
  globalIgnores([".next/**", "out/**", "build/**", "generated/**", "next-env.d.ts", "skills/providers/**/examples/**"]),
]);
