# Références Banani

La connexion MCP Banani est configurée localement via `.codex/config.toml` (ignoré par Git).

Après connexion réussie, utilise dans Antigravity/Codex :

```text
/import-banani
```

Le workflow doit parcourir le projet Banani via les outils MCP réellement disponibles et écrire un snapshot **sans secret** dans :

- `imported-design.json` — créé uniquement après un vrai import MCP ;
- `screens.json` — inventaire normalisé utilisé par le planner ;
- `import-schema.json` — contrat de données attendu ;
- `screens/` — exports/captures optionnels de repli.

Puis :

```bash
npm run import-banani:check
npm run import-banani:analyze
```

Le kit génère `generated/banani-gap-analysis.md` puis `generated/implementation-plan.md`.

Le code de production reste dans `app/`, `components/` et `lib/`. Banani définit l’intention visuelle ; les règles métier, permissions, paiements et sécurité restent contrôlés par le starter et doivent être confirmés séparément.
