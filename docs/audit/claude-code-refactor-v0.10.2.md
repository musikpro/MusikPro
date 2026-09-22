# Refactor Claude Code — V0.10.2

Objectif : permettre l’utilisation du même Africa SaaS Kit avec OpenAI/Codex/Antigravity et Claude Code, sans fork fonctionnel du projet. Les workflows restent centralisés dans `.agents/skills/`; Claude Code reçoit `CLAUDE.md` et des commandes locales qui appellent les mêmes scripts.

Les états Computer Use sont séparés et locaux afin d’éviter un faux PASS entre agents.
