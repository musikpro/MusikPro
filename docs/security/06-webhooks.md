# 06 — Webhooks

- Vérifie la signature avec la méthode officielle de chaque fournisseur.
- Lis le corps brut si le fournisseur signe le payload brut.
- Stocke l'identifiant événement avec contrainte UNIQUE.
- Réponds rapidement 2xx après traitement sûr; rends le traitement réessayable.
- Un même événement reçu 2, 5 ou 20 fois ne doit créditer le client qu'une seule fois.
- N'écris jamais les secrets du webhook dans les logs.
