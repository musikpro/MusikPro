# PayDunya — V0.5

## Variables
```env
PAYDUNYA_ENVIRONMENT=sandbox
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_TOKEN=...
```

## Flux
1. Le serveur crée une Checkout Invoice PayDunya.
2. Le token retourné est enregistré dans `payments.provider_payment_id`.
3. Le client est redirigé vers la page hébergée PayDunya.
4. L'IPN arrive sur `/api/webhooks/paydunya`.
5. Le hash IPN est comparé à SHA-512 du Master Key.
6. Le serveur confirme ensuite le token via l'API PayDunya.
7. Montant, devise et référence applicative sont comparés aux données Neon.
8. L'abonnement n'est activé qu'après succès de ces contrôles.

## Production
Tester au minimum : succès, pending, annulation, IPN dupliqué, mauvais hash, mauvais montant et indisponibilité temporaire d'une méthode Mobile Money.
