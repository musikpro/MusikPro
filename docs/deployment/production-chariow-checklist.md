# Liste de contrôle — mise en production (Chariow, crédits, génération)

Ordre obligatoire du kit : **local → staging Vercel → validation → production**. Cette liste complète
[staging-vercel.md](./staging-vercel.md) pour les changements de la branche `feat/chariow-paiement-suivi-generation`.

Neon a trois branches (projet `weathered-block-07936773`) : `development` (celle de `.env.local`), `staging`, `production`.
Tout ce qui a été fait jusqu'ici l'a été **uniquement sur `development`**.

## 1. Base de données (à faire sur staging, puis sur production)

Ne pas lancer `npm run db:migrate` : le journal Drizzle est en retard sur `db/migrations/`. Appliquer les fichiers SQL
ci-dessous, dans l'ordre, en SQL idempotent, en indiquant explicitement la branche cible.

| Migration                               | Effet                                                                       | Attention                                      |
| --------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| `0049_musicful_redirect_delay.sql`      | Colonne `redirect_delay_seconds` (audio_provider_configs)                   | Additive                                       |
| `0050_discover_library.sql`             | Tables `discover_settings`, `discover_hidden_songs`                         | Contient les GRANT du rôle runtime             |
| `0051_clear_credit_plan_badges.sql`     | **Modifie des données** : retire trois anciens badges de plans              | Correction de données, pas seulement de schéma |
| `0052_currencies_catalog.sql`           | Tables `currencies`, `currency_settings` + monnaies par défaut (XOF)        | Contient les GRANT du rôle runtime             |
| `0053_audio_provider_default.sql`       | Colonne `is_default_for_audio` ; Musicful devient le fournisseur par défaut | Ne change rien si un défaut existe déjà        |
| `0054_audio_provider_webhook_token.sql` | Colonnes du jeton de webhook fournisseur audio                              | Additive                                       |

Après application : vérifier que les nouvelles tables sont lisibles avec le rôle `musikpro_runtime`
(sinon la page Découvrir ou la page Langues et Monnaies échouera).

## 2. Variables d'environnement Vercel (Production)

Voir `config/deployment-env.json` pour la liste complète. Points propres à ce lot :

- `PAYMENT_WEBHOOK_BASE_URL` = domaine final en HTTPS. **Jamais ngrok.**
- `NEXT_PUBLIC_APP_URL` et `BETTER_AUTH_URL` = domaine final.
- `APP_SECRETS_ENCRYPTION_KEY` : clé **propre à la production** (`openssl rand -base64 32`). Elle chiffre les clés API
  enregistrées dans l'admin.
- `DATABASE_URL` (rôle `musikpro_runtime`) et `DATABASE_SERVICE_URL` (rôle `musikpro_service`) pointent sur la branche `production`.
- `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` : requis en production (limitation de débit, cron).
- Les variables Preview et Production restent séparées, avec des secrets différents.

## 3. Secrets à ressaisir dans l'admin de production

Les clés enregistrées en développement sont chiffrées avec la clé de développement : elles **ne sont pas transférables**.
Dans l'admin du site déployé :

1. **Paiements → Chariow** : clé API Chariow, mode **Production**, cocher « Activer Chariow », enregistrer.
   Le secret du webhook est généré par MusikPro (laisser le champ vide) ; noter les 4 derniers caractères.
2. **Produits Chariow** : relier chaque offre active à son produit (l'offre Découverte : produit « Pack Découverte
   MusikPro – 5 crédits »). Le prix du produit Chariow doit être identique au prix du plan MusikPro
   (Chariow impose un minimum de 578 F CFA).
3. **Fournisseurs IA → Audio** : clé API du fournisseur audio actif (Musicful, ou MusicGPT + son jeton de webhook).
4. Vérifier les plans actifs, les monnaies (XOF par défaut) et le fournisseur audio « actif ».

## 4. Chariow — Pulse

Dans l'espace Chariow, créer un **nouveau Pulse « Vente réussie »** (tous les produits) pointant vers :

`https://<domaine final>/api/webhooks/chariow?secret=<secret affiché dans l'admin de production>`

Puis supprimer le Pulse de développement (celui qui pointe vers ngrok). L'adresse complète, secret compris, est
affichée dans l'admin : ne pas la partager en capture d'écran.

## 5. Contrôles avant déploiement

```bash
npm run kit:verify
npm run security-saas
npm run staging:check
npm run staging:deploy
npm run staging:test -- --url=https://<preview>.vercel.app
npm run staging:approve -- --url=https://<preview>.vercel.app
npm run deploy:production:check
```

`kit:audit` échoue actuellement à 27/28 à cause d'un ancien worktree local (`.claude/worktrees/song-card-share-publish-poster`),
pas à cause du code du projet : le supprimer avant le contrôle final.

## 6. Test sur staging (avant d'approuver)

Sur l'URL de staging, avec la base `staging` migrée :

1. Créer une chanson de A à Z ; vérifier le débit de 2 crédits et l'apparition de la chanson sans actualiser.
2. Acheter l'offre Découverte via Chariow (578 F CFA, paiement réel) ; vérifier :
   - la page de paiement Chariow s'ouvre en un clic sur « Aller au paiement » ;
   - le Pulse reçoit HTTP 200 (journal d'audit `payment.webhook.processed`) ;
   - le solde passe de 0 à 5 sans recharger la page, et l'achat apparaît dans l'historique.
3. `/api/health` et `/api/readyz` répondent 200.

## 7. Après la mise en production

- Refaire un achat réel d'une offre et une génération sur le domaine final.
- Le cron `/api/cron/reconcile-payments` (tous les jours à 04:00) rattrape une vente payée dont le Pulse aurait été manqué.
- Surveiller les journaux d'audit `payment.webhook.processing_failed` pendant les premiers jours.
- Retour arrière : les changements de schéma sont additifs ; seule la 0051 modifie des données (badges de plans).
