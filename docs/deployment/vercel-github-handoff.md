# GitHub → Vercel — Deployment & Environment Handoff

Ce guide est utilisé par l'IA du kit au moment de la mise en ligne. Le but n'est pas de donner une liste vague, mais de conduire la mise en production **gate par gate** sans oublier une clé, un callback ou un webhook.

## Commande de départ

```bash
npm run deploy:handoff
```

Puis ouvrir :

```text
generated/deployment-handoff.md
```

Le rapport inspecte `.env.local` uniquement pour savoir si une variable est présente. **Il ne copie jamais sa valeur** dans le document généré.

## Gate 1 — GitHub

1. Exécuter `npm install` et commiter le vrai `package-lock.json`.
2. Exécuter `npm run verify:code`.
3. Vérifier que `.env`, `.env.local`, clés `.pem/.key` et fichiers de credentials ne sont pas suivis.
4. Créer/pousser le repository GitHub.
5. Activer les protections de branche selon le niveau du projet.
6. Attendre le passage de la CI.

L'IA doit demander confirmation avant de passer au Gate 2.

## Gate Staging obligatoire — avant toute Production

Après création du projet Vercel, créer une Preview/Staging et suivre `docs/deployment/staging-vercel.md`. La Production est interdite tant que `npm run staging:approve` puis `npm run deploy:production:check` ne passent pas pour le commit courant.

## Gate 2 — Projet Vercel

1. Importer le repository GitHub dans Vercel.
2. Détecter Next.js automatiquement.
3. Ne pas considérer le premier build comme une preuve que la configuration production est complète.
4. Relier le domaine final avant de figer les callbacks externes.

## Gate 3 — Domaine

Utiliser un vrai domaine HTTPS final, par exemple :

```text
https://app.example.com
```

Ce domaine devient la référence pour :

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `PAYMENT_WEBHOOK_BASE_URL`
- callbacks Google
- webhooks de paiement
- Search Console
- canonical/OG

Ne jamais utiliser une URL ngrok en production.

## Gate 4 — Variables Vercel

Utiliser `generated/deployment-handoff.md`. L'IA présente **un groupe à la fois**, pas 40 variables d'un seul coup.

Règles :

- secrets : saisir directement dans Vercel, jamais dans le chat ;
- `NEXT_PUBLIC_*` : valeurs publiques uniquement ;
- production : utiliser les vraies clés live uniquement après validation sandbox ;
- Preview : préférer des clés sandbox/test, ou désactiver les paiements si le provider ne permet pas un environnement de preview sûr ;
- `BETTER_AUTH_SECRET` doit être distinct entre environnements ;
- ne pas mettre `PAYMENT_WEBHOOK_BASE_URL` sur ngrok en production.

## Gate 5 — Neon

1. Utiliser la `DATABASE_URL` de production.
2. Appliquer les migrations prévues par le projet.
3. Vérifier les tables, contraintes d'idempotence et schéma Better Auth.
4. Sauvegarde/restore : confirmer la stratégie avant lancement.

## Gate 6 — Google + Resend

Google OAuth production :

```text
https://TON-DOMAINE/api/auth/callback/google
```

L'URI doit être enregistrée dans le client OAuth Google Cloud utilisé en production.

Resend :

- domaine d'envoi vérifié ;
- `RESEND_API_KEY` production ;
- `EMAIL_FROM` appartenant au domaine vérifié ;
- email de vérification/reset testé sur le déploiement réel.

## Gate 7 — Paiements

Endpoint commun :

```text
https://TON-DOMAINE/api/webhooks/<provider>
```

Exemples :

```text
/api/webhooks/fedapay
/api/webhooks/paydunya
/api/webhooks/chariow
/api/webhooks/moneroo
/api/webhooks/flutterwave
```

Pour chaque provider activé :

1. renseigner les variables indiquées dans le rapport ;
2. configurer l'URL webhook dans le dashboard du provider ;
3. vérifier la signature/IPN ;
4. re-puller la transaction depuis l'API provider ;
5. tester idempotence/replay ;
6. ne passer en live qu'après sandbox validé.

## Gate 8 — Cron

Route :

```text
/api/cron/reconcile-payments
```

`CRON_SECRET` doit être long, aléatoire, privé et configuré en production.

## Gate 9 — SEO / Search Console

- domaine HTTPS final ;
- `robots.txt` ;
- `sitemap.xml` ;
- canonical ;
- Open Graph ;
- propriété Domain dans Search Console ;
- vérification DNS ;
- soumission du sitemap ;
- inspection des URLs principales.

## Gate 10 — Validation finale

```bash
npm run verify:production
npm run doctor:production:online
```

Puis tests manuels : auth, email, paiement sandbox/live contrôlé, responsive mobile, skeleton loaders, social preview et accès privés.

Le statut reste **NON VÉRIFIÉ** pour tout service qui n'a pas été réellement testé sur le domaine final.


## Cloudflare optionnel — Phase 17
Après validation du staging, le projet peut utiliser Cloudflare pour acheter/gérer le domaine ou gérer le DNS. Ce n’est pas obligatoire.

- Sans Cloudflare : garder le registrar/DNS choisi et marquer la Phase 17 `skipped`.
- Avec Cloudflare : lancer `npm run cloudflare:setup`, puis recopier dans Cloudflare DNS les enregistrements exacts demandés par Vercel.
- Ne jamais considérer cette phase comme une activation de Cloudflare R2.


## Cloudinary optionnel — Phase 18
Ajouter les variables Cloudinary à Vercel uniquement si les uploads d’images sont activés et testés en staging.
