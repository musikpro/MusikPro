import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { i18nAuthFiles, i18nClientFiles, i18nClientTextSelectors } from "./eslint/i18n-client-text.mjs";

export default defineConfig([
  ...fixupConfigRules([...nextVitals, ...nextTs]),
  {
    files: i18nClientFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...i18nClientTextSelectors] },
  },
  {
    // Écrans d'authentification : même garde en erreur que le périmètre client.
    files: i18nAuthFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...i18nClientTextSelectors] },
  },
  globalIgnores([".next/**", "out/**", "build/**", "generated/**", "next-env.d.ts", "skills/providers/**/examples/**"]),
]);
