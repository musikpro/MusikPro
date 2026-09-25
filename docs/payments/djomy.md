# Djomy — statut V0.5 : merchant-validation

Le provider est volontairement bloqué dans l'administration tant que la documentation technique correspondant au compte marchand n'a pas permis de confirmer :

- mécanisme d'authentification ;
- endpoint de création du paiement ;
- endpoint de vérification ;
- format du callback/webhook ;
- mécanisme cryptographique de vérification du webhook ;
- identifiants de transaction et statuts finaux.

Ne jamais remplacer ces éléments par des suppositions. Une fois confirmés, implémenter `createCheckout`, `verifyPayment`, `verifyWebhook` et `parseWebhook`, puis seulement changer la readiness du provider.
