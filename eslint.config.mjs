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
    // Écrans d'authentification : avertissement tant que les tâches 7 et 8 ne sont pas faites ; basculer en "error" à la tâche 11.
    files: i18nAuthFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["warn", ...i18nClientTextSelectors] },
  },
  globalIgnores([".next/**", "out/**", "build/**", "generated/**", "next-env.d.ts", "skills/providers/**/examples/**"]),
]);
