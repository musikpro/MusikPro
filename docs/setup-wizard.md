# Setup Wizard

Le wizard principal configure uniquement le **socle du SaaS** : pays, nom, URL, sécurité, email, Google et services de base.

Il **ne demande aucun provider de paiement**.

```bash
npm run setup
```

Configuration initiale valide :

```json
{
  "paymentsEnabled": false,
  "providers": [],
  "defaultProvider": null,
  "methods": []
}
```

Les paiements sont traités uniquement en Phase 16 :

```bash
npm run payments:setup
```

Si le SaaS n’a pas besoin de paiement :

```bash
npm run payments:setup -- --none
```

Puis la phase peut être marquée `skipped`.


## Phase 18 — Cloudflare optionnel
Cloudflare n’est proposé qu’à la fin du setup. Le SaaS reste valide sans Cloudflare. Cette phase concerne le domaine/DNS et non R2.


## Phase 16 — Upstash optionnel
Upstash Redis n’est jamais requis par le wizard principal. Le choix se fait plus tard avec `npm run upstash:setup` ou `npm run upstash:setup -- --none`.
