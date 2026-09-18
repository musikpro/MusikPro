# Réconciliation des paiements

La V0.7.1 ajoute :

```text
POST /api/cron/reconcile-payments
```

En production, définir :

```env
CRON_SECRET=<secret aléatoire long>
```

Puis appeler le cron avec :

```text
Authorization: Bearer <CRON_SECRET>
```

Le job re-vérifie jusqu'à 100 paiements `pending` ou `failed` créés durant les 14 derniers jours. Il ne fait jamais confiance à un ancien statut local : il appelle `provider.verifyPayment()` puis applique les mêmes contrôles montant/devise/référence que le webhook.

Un paiement tardif peut donc être rattrapé sans double crédit.
