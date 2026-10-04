# Tests des parcours critiques

Le kit possède déjà Vitest, Security Baseline, Zod, RBAC, multi-tenant, rate limiting et des tests ciblés. Ce gate ne duplique pas ces mécanismes : il vérifie que les parcours critiques disposent d'une couverture identifiée.

Commande :

```bash
npm run critical-flows:check
```

Le registre est `config/critical-flows.json`.

Avant production, les scénarios nécessitant une vraie session, une base ou un navigateur doivent également être testés réellement (signup/login/logout, vérification email, reset password, accès admin, isolation tenant, rate limit). Sans preuve réelle, ils restent **NON VÉRIFIÉS** et ne doivent pas être transformés en faux PASS.
