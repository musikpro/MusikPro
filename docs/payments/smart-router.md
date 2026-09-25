# Smart Payment Router — V0.5

Le Smart Router ne remplace pas la vérification de paiement. Il choisit uniquement la passerelle à laquelle demander un checkout.

## Signaux utilisés

1. pays ISO (`CI`, `SN`, `BJ`, etc.) ;
2. méthode demandée (`wave`, `orange_money`, `mtn`, `moov`, `mobile_money`, `card`) ;
3. activation administrative ;
4. priorité de route ;
5. taux de création de checkout réussi sur les dernières 24 h.

## Fallback

- Si le client/admin demande explicitement un provider, aucun fallback silencieux n'est appliqué.
- En mode automatique, le router peut essayer le provider suivant après une erreur de création de checkout.
- Chaque tentative est enregistrée dans `payment_attempts`.
- Un checkout créé n'est jamais considéré comme payé.

## Sécurité

Ne jamais utiliser le taux de réussite du router pour décider qu'une transaction est payée. La table `payments` passe à `paid` uniquement après le pipeline de webhook sécurisé et de vérification serveur.
