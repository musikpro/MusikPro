# 03 — Neon / PostgreSQL

- Une base/projet séparé par environnement.
- `DATABASE_URL` uniquement côté serveur.
- Utilise un rôle DB avec le minimum de privilèges nécessaire.
- Active et vérifie la stratégie de sauvegarde/restauration.
- Les migrations passent par CI ou une procédure contrôlée, jamais depuis le navigateur.
- Ajoute contraintes UNIQUE, foreign keys et transactions pour les opérations financières.
- N'enregistre pas inutilement de données sensibles.
