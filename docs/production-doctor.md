# Production Doctor V0.8.2

Le Production Doctor ne remplace pas un audit humain. Il rassemble des preuves automatisables et classe les points en `PASS`, `WARN`, `FAIL` ou `UNVERIFIED`.

## Local

```bash
npm run doctor:production
```

## Avec tests réseau de la production

```bash
npm run doctor:production:online
```

Le mode online teste notamment DNS, HTTPS, headers, `robots.txt` et `sitemap.xml` à partir de `APP_URL`/`NEXT_PUBLIC_APP_URL`.

## Rapport

Le résultat est enregistré dans `generated/production-doctor.json` et affichable dans `/admin/production-doctor`.

Un `PASS` sur la présence d'une configuration ne prouve pas que le fournisseur externe fonctionne. Les paiements doivent toujours être testés en sandbox avec un vrai webhook/IPN et une réconciliation fournisseur.
