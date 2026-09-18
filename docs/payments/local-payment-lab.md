# Local Payment Lab — ngrok + paiements sandbox

Objectif : tester un checkout réel sandbox et recevoir les webhooks/IPN sur le serveur Next.js local sans déployer le SaaS.

## Architecture

```text
Navigateur local -> http://localhost:3000
                         |
                         | checkout sandbox
                         v
                  Provider de paiement
                         |
                         | webhook HTTPS
                         v
                https://xxxx.ngrok.app
                         |
                         v
             http://localhost:3000/api/webhooks/<provider>
                         |
                         v
        signature -> verify API -> idempotence -> fulfillment
```

ngrok est un tunnel, pas une preuve de paiement. La route webhook du provider doit toujours valider sa signature/IPN puis re-lire la transaction chez le provider avant d'activer un abonnement ou des crédits.

## Prérequis

Sur macOS Apple Silicon, l’installation recommandée est :

```bash
brew install ngrok
ngrok config add-authtoken "<TON_AUTHTOKEN>"
```

Puis vérifier :

```bash
ngrok version
```

1. Un compte ngrok.
2. Le CLI ngrok installé sur le Mac.
3. L’authtoken ngrok configuré une fois sur la machine.
4. Les clés sandbox du provider dans `.env.local`.
5. Un plan actif dans Neon et une route de paiement compatible.

## Parcours guidé obligatoire

### Gate 1 — serveur local
Terminal A :

```bash
npm run dev
```

Vérifier `http://localhost:3000`.

### Gate 2 — tunnel HTTPS
Terminal B :

```bash
npm run payments:ngrok
```

ngrok expose le port 3000 en HTTPS. Garder ce terminal ouvert.

### Gate 3 — découverte automatique
Terminal C :

```bash
npm run payments:local
```

Le script interroge l'API locale ngrok sur `127.0.0.1:4040`, récupère le tunnel HTTPS et génère :

- `generated/local-payment-lab.json`
- `generated/local-payment-lab.md`
- une URL `/api/webhooks/<provider>` pour chaque provider activé.

Pour enregistrer le tunnel comme base webhook locale :

```bash
npm run payments:local:apply
```

Cela écrit seulement :

```env
PAYMENT_WEBHOOK_BASE_URL=https://xxxx.ngrok.app
```

dans `.env.local`. Redémarrer ensuite `npm run dev`.

`NEXT_PUBLIC_APP_URL` peut rester `http://localhost:3000`. Le tunnel est réservé aux webhooks/IPN.

### Gate 4 — dashboard sandbox du provider
Copier l'URL générée correspondant au provider, par exemple :

```text
https://xxxx.ngrok.app/api/webhooks/fedapay
https://xxxx.ngrok.app/api/webhooks/paydunya
https://xxxx.ngrok.app/api/webhooks/chariow
```

Ne jamais copier une URL d'un autre provider.

Configurer uniquement l'environnement sandbox/test à cette étape.

### Gate 5 — checkout réel sandbox
1. Ouvrir `/dashboard/billing`.
2. Choisir un plan.
3. Démarrer le checkout.
4. Effectuer le scénario sandbox proposé par le provider.
5. Revenir dans l'app.

Résultat attendu : le navigateur ne décide jamais que le paiement est réussi. L'état final vient du webhook/IPN et/ou de la réconciliation API fournisseur.

### Gate 6 — vérifier les données
Contrôler :

- `payments.status = paid` uniquement après vérification fournisseur ;
- montant et devise identiques ;
- référence identique ;
- `providerPaymentId` présent ;
- abonnement/crédits attribués une seule fois ;
- `webhook_events`/idempotency key enregistré.

### Gate 7 — scénarios obligatoires
Tester au minimum :

1. succès ;
2. annulation utilisateur ;
3. échec provider ;
4. paiement qui reste `pending` ;
5. webhook reçu deux fois ;
6. webhook rejoué depuis l'inspecteur ngrok ;
7. webhook avec signature invalide ;
8. mauvais montant/devise/référence si le sandbox permet de simuler le cas ;
9. indisponibilité du premier provider et fallback automatique si le Smart Router est activé.

### Gate 8 — replay / inspection
L'inspecteur de trafic ngrok peut servir à visualiser puis rejouer une requête webhook. Un replay valide ne doit jamais créditer deux fois le même paiement.

Attention : la capture complète des corps peut contenir des données personnelles ou des tokens. Ne l'activer que temporairement pour le debug, sur des comptes sandbox, puis la désactiver.

### Gate 9 — clôture du test local
Quand les tests sont terminés :

1. arrêter ngrok ;
2. supprimer ou vider `PAYMENT_WEBHOOK_BASE_URL` si on ne teste plus ;
3. ne jamais réutiliser les clés sandbox en production ;
4. configurer les webhooks production avec le vrai domaine HTTPS ;
5. relancer les tests de paiement en staging avant le live.

## Règle pour l'IA

L'IA doit conduire l'utilisateur Gate par Gate. Elle ne doit pas dire « paiement testé » tant que les scénarios succès + échec + duplicate/replay n'ont pas été observés et que la base n'a pas confirmé un fulfillment unique.
