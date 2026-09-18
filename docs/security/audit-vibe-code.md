# Audit sécurité des projets vibe-codés

La V0.7.1 adopte deux principes issus des documents d'audit fournis avec le kit :

1. **Ne jamais déclarer une protection conforme sans preuve.** Un résultat absent du scan n'est pas automatiquement un PASS.
2. **Chaque entrée HTTP est une frontière de sécurité** : Route Handler, Server Action, webhook, cron exposé, callback OAuth.

## Contrôles minimum avant production

- secrets et historique Git ;
- variables `NEXT_PUBLIC_` ;
- authentification et autorisation côté serveur ;
- contrôle de propriété des ressources (anti-IDOR) ;
- mass assignment (`role`, `credits`, etc.) ;
- validation Zod côté serveur ;
- SQL paramétré ;
- XSS ;
- cookies et sessions ;
- rate limiting auth/API ;
- bot protection ;
- vérification/reconciliation des webhooks ;
- CORS si API cross-origin ;
- uploads privés/publics séparés ;
- headers HTTPS/CSP/HSTS ;
- lockfile et audit des dépendances ;
- recherche de secrets dans `.next/static` après build.

## Commande

```bash
npm run security:audit
```

Le rapport de ce script est volontairement un ensemble de signaux. Une revue humaine/agent doit ouvrir les fichiers concernés avant de classer une vulnérabilité.
