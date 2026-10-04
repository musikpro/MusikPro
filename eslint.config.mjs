import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { i18nClientFiles, i18nClientTextSelectors } from "./eslint/i18n-client-text.mjs";

export default defineConfig([
  ...fixupConfigRules([...nextVitals, ...nextTs]),
  {
    // Inclut les écrans d'authentification (i18nAuthFiles, déjà intégrés à i18nClientFiles).
    files: i18nClientFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...i18nClientTextSelectors] },
  },
  {
    rules: {
      // Convention du projet : un paramètre préfixé par « _ » est volontairement inutilisé (signature imposée
      // par une Server Action `(previous, formData)` ou par l'interface d'un fournisseur de paiement).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Notre composant `Image` (components/banani/Image.tsx) calcule lui-même l'attribut alt : seul <img> natif est contrôlé.
      "jsx-a11y/alt-text": ["warn", { elements: ["img"] }],
    },
  },
  {
    // Scripts de contrôle du kit : `cond ? ok(...) : fail(...)` est un idiome volontaire.
    files: ["scripts/**/*.mjs"],
    rules: { "@typescript-eslint/no-unused-expressions": ["warn", { allowTernary: true, allowShortCircuit: true }] },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "generated/**",
    "next-env.d.ts",
    ".claude/skills/providers/**/examples/**",
    // Artefacts natifs générés par Capacitor / Gradle / Xcode.
    "android/**",
    "ios/**",
  ]),
]);
