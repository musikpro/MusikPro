import { Linter } from "eslint";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { i18nClientTextSelectors } from "../eslint/i18n-client-text.mjs";

// @typescript-eslint/parser n'est pas hissé à la racine de node_modules : on le résout
// depuis typescript-eslint, installé via eslint-config-next.
const requireFromTsEslint = createRequire(
  path.join(process.cwd(), "node_modules/eslint-config-next/node_modules/typescript-eslint/package.json"),
);
const tsParser = requireFromTsEslint("@typescript-eslint/parser") as Linter.Parser;

const linter = new Linter({ configType: "flat" });
const lint = (code: string) =>
  linter.verify(code, [
    {
      files: ["**/*.tsx"],
      languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: { "no-restricted-syntax": ["error", ...i18nClientTextSelectors] },
    },
  ], "x.tsx");

describe("i18n client text rule", () => {
  it.each([
    ["JSX text", "const A = () => <p>Créer une chanson</p>;"],
    ["placeholder literal", 'const A = () => <input placeholder="Entrer ton prénom" />;'],
    ["aria-label expression literal", "const A = () => <button aria-label={\"Créer une chanson\"} />;"],
    ["notify literal", 'notify("Chanson retirée.");'],
    ["demo.notify literal", 'demo.notify("Chanson retirée.");'],
    ["notify template", "notify(`Il faut ${n} crédits pour générer.`);"],
  ])("flags %s", (_name, code) => {
    expect(lint(code).length).toBeGreaterThan(0);
  });

  it.each([
    ["wrapped JSX text", 'const A = () => <p>{t("Créer une chanson")}</p>;'],
    ["wrapped attribute", 'const A = () => <input placeholder={t("Entrer ton prénom")} />;'],
    ["notify with t", 'notify(t("Chanson retirée."));'],
    ["unaccented identifier text", "const A = () => <p>{title}</p>;"],
    ["notify empty string", 'notify("");'],
    ["non-user attribute", 'const A = () => <div className="é" data-x="é" />;'],
  ])("accepts %s", (_name, code) => {
    expect(lint(code)).toHaveLength(0);
  });
});
