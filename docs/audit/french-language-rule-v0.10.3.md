# Audit — règle de langue française V0.10.3

## Objectif

Garantir que tous les agents IA supportés par Africa SaaS Kit répondent à l’utilisateur en français.

## Fichiers protégés

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/README.md`
- tous les `.agents/skills/*/SKILL.md` officiels

## Gate

`npm run kit:integrity` échoue si la règle disparaît d’un fichier d’instruction critique.

## Exception technique

Les commandes, chemins, identifiants, noms d’API et extraits de code conservent leur syntaxe d’origine.
