# Audit d’intégrité — Africa SaaS Kit V0.9.5

Cette refactorisation vise la non-régression et la simplicité d’installation.

## Corrections

- Le marqueur de progression `/setup-saas` accepte désormais les phases 1 à 21.
- Le contrôle sécurité attend lui aussi le contrat 21 phases.
- La conformité structurelle ne confond plus un starter non installé avec une production incomplète.
- Le lockfile reste obligatoire avant la production via `dependencies:check:production`.

## Fonction complémentaire ajoutée

`npm run doctor:kit` fournit un diagnostic non destructif des prérequis essentiels, du skill officiel, de Zod, de la sécurité, des tests et du pipeline mobile WebView. Les dépendances ou outils mobiles absents sont présentés comme éléments à préparer, sans bloquer un projet Web-only.

## Contrôles exécutés sur la distribution

- intégrité des fichiers critiques et du skill officiel ;
- syntaxe Node des scripts ;
- validité JSON ;
- cohérence des scripts npm et de leurs cibles ;
- inventaire des routes et fonctionnalités ;
- gates Zod, sécurité, runtime, responsive, SEO, hydratation, loading et icônes ;
- pipeline Mobile WebView optionnel ;
- nettoyage des artefacts générés.

Le build Next.js, ESLint, TypeScript, Vitest et `npm audit` nécessitent l’installation effective des dépendances. Ils restent dans les gates de production et de CI.
