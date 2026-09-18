# 02 — Variables d'environnement

- `NEXT_PUBLIC_*` est lisible par le navigateur: n'y place jamais une clé secrète.
- Sépare les secrets dev/staging/prod.
- Utilise des secrets longs et uniques pour Better Auth et les signatures.
- Fais une rotation périodique des clés critiques et immédiatement après suspicion de fuite.
- Donne à chaque service uniquement les permissions nécessaires.
