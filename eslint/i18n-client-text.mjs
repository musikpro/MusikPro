/**
 * Garde i18n : signale tout texte français (accentué) écrit en dur dans les composants client,
 * au lieu de t("…") / translateTemplate("…", {…}). Limite connue : un texte français sans accent
 * n'est pas détecté. Cas légitime (valeur canonique stockée en français, etc.) : désactiver la
 * ligne avec `// eslint-disable-next-line no-restricted-syntax -- <raison>`.
 */
export const i18nAuthFiles = [
  "app/(auth)/**/*.{ts,tsx}",
  "components/auth/**/*.{ts,tsx}",
  "components/auth-form.tsx",
  "components/forgot-password-form.tsx",
  "components/reset-password-form.tsx",
  "components/two-factor-challenge.tsx",
  "components/two-factor-setup.tsx",
];

export const i18nClientFiles = [
  "app/dashboard/**/*.{ts,tsx}",
  "app/s/**/*.{ts,tsx}",
  "app/page.tsx",
  "app/not-found.tsx",
  "app/loading.tsx",
  "components/banani/**/*.{ts,tsx}",
  "components/mobile/**/*.{ts,tsx}",
  "components/mobile-bottom-nav.tsx",
  "components/dashboard-nav.tsx",
  "components/checkout-button.tsx",
  "components/ui/**/*.{ts,tsx}",
  "components/pwa/**/*.{ts,tsx}",
  ...i18nAuthFiles,
];

const ACCENT = "[àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŒ]";
const ATTRS = "/^(placeholder|aria-label|title|alt|label)$/";
const message =
  "Texte français en dur : l'envelopper avec t(\"…\") ou translateTemplate(\"…{param}…\", { param }) (lib/i18n/translate.ts).";

export const i18nClientTextSelectors = [
  { selector: `JSXText[value=/${ACCENT}/]`, message },
  { selector: `JSXAttribute[name.name=${ATTRS}] > Literal[value=/${ACCENT}/]`, message },
  { selector: `JSXAttribute[name.name=${ATTRS}] > JSXExpressionContainer > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.name='notify'] > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.property.name='notify'] > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.name='notify'] > TemplateLiteral > TemplateElement[value.raw=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.property.name='notify'] > TemplateLiteral > TemplateElement[value.raw=/${ACCENT}/]`, message },
];
