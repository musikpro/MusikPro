---
name: provider
description: Liste et charge les skills, guides et adaptateurs des fournisseurs de paiement de Africa SaaS Kit. Utiliser avec /provider pour voir le catalogue ou /provider <nom> pour ouvrir un provider précis, sans forcer l'activation des paiements.
---
# /provider — Routeur officiel des providers Africa SaaS Kit

Cette skill est le point d'entrée officiel pour consulter les fournisseurs de paiement du kit.

## Syntaxe

- `/provider` — afficher tous les providers connus et comment les appeler.
- `/provider list` — identique à `/provider`.
- `/provider chariow`
- `/provider fedapay`
- `/provider paydunya`
- `/provider flutterwave`
- `/provider moneroo`
- `/provider paytech`
- `/provider bictorys`
- `/provider djomy`
- `/provider stripe`

Les paiements sont OPTIONNELS dans Africa SaaS Kit. Ne jamais forcer la configuration d'un provider.

## Avant de répondre

1. Lire `config/provider-skills.json`.
2. Lire `config/providers.json`.
3. Si aucun provider n'est précisé, afficher le catalogue puis s'arrêter.
4. Si un provider est précisé, vérifier qu'il existe dans le registre.
5. Charger uniquement les sources indiquées par le registre pour ce provider.

## Interprétation de skillStatus

- `dedicated` : lire le fichier `skill` indiqué ; c'est un skill fournisseur dédié embarqué.
- `shared` : lire le fichier `skill` partagé ET les `references` du provider.
- `integration-doc-only` : il n'existe pas encore de skill dédié ; lire uniquement les références indiquées et le dire clairement.
- `adapter-only` : il n'existe pas encore de skill/guide complet ; lire l'adaptateur indiqué et ne pas inventer les parties manquantes.

## Format de `/provider`

Afficher un tableau :

| Provider | Comment l'appeler | Couverture | Maturité | Source |

Couverture :
- `✅ skill dédié`
- `🟢 skill partagé + référence`
- `🟡 documentation seulement`
- `⚪ adaptateur seulement`

Terminer par :
`Pour ouvrir un provider : /provider <nom>`

## Format de `/provider <nom>`

Présenter :
1. Provider et rôle.
2. Commande utilisée.
3. Type de couverture réellement disponible.
4. Maturité de l'adaptateur (`production`, `beta`, `merchant-validation`, `scaffold`).
5. Fichiers effectivement lus.
6. Ce que le skill/guide couvre.
7. Variables d'environnement requises — noms seulement, jamais les valeurs.
8. Checkout / API.
9. Webhook et vérification de signature si les sources le documentent.
10. Réconciliation/idempotence.
11. Tests sandbox encore nécessaires.
12. Ce qui n'est PAS documenté ou vérifié.

## Sécurité

- Ne jamais demander une clé API ou secret dans le chat.
- Indiquer de les mettre dans `.env.local` en local ou Vercel Environment Variables en production.
- Ne jamais déclarer un paiement réussi depuis une simple redirect URL.
- Toujours privilégier signature/IPN + relecture fournisseur + montant/devise/référence + idempotence.
- Respecter le statut de maturité du provider ; un provider beta ne doit pas être activé live automatiquement.
