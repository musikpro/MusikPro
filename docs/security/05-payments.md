# 05 — Paiements Afrique

Ne donne jamais un abonnement parce que le navigateur arrive sur `/success`.

Flux obligatoire:

1. créer une référence interne unique;
2. enregistrer un paiement `pending`;
3. créer le checkout chez le fournisseur;
4. recevoir webhook/callback serveur;
5. vérifier signature/authenticité;
6. vérifier transaction auprès de l'API du fournisseur lorsque recommandé;
7. comparer montant + devise + référence + statut;
8. appliquer idempotence;
9. seulement ensuite activer abonnement/crédits;
10. conserver un audit.

Les justificatifs/captures Mobile Money ne sont jamais une preuve suffisante.
