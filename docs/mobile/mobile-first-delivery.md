# Mobile-First Delivery System

Africa SaaS Kit doit être construit comme une application mobile d'abord, puis enrichi pour tablette et desktop.

## Principe

Le style de base cible le petit écran. Les breakpoints ajoutent progressivement de l'espace et des layouts plus larges. Ne pas construire une page desktop puis tenter de la compresser après coup.

## Matrice minimale de validation

Chaque écran important doit être contrôlé au minimum à :

- 320 px — petit Android ;
- 360 px — Android courant ;
- 390 px — iPhone courant ;
- 430 px — grand smartphone ;
- 768 px — tablette ;
- 1024 px — tablette/desktop compact ;
- 1440 px — desktop.

## Gate Mobile pour chaque écran

Un écran n'est pas terminé tant que :

- aucun scroll horizontal global n'existe ;
- texte et boutons ne sont pas tronqués ;
- les actions principales sont accessibles au pouce ;
- les cibles tactiles font au moins ~44 px de hauteur ;
- la navigation principale est claire en mobile ;
- la safe area bas d'écran est respectée ;
- les tableaux sont scrollables horizontalement sans casser la page ;
- formulaires utilisables avec clavier mobile ;
- modales/drawers restent dans le viewport ;
- loading, empty, error et success fonctionnent sur mobile ;
- les images/contenus ne créent pas de layout shift important ;
- la version desktop reste cohérente après validation mobile.

## Navigation fluide

Le starter fournit une barre de navigation basse sur mobile. Pour un SaaS final, l'IA doit adapter ses entrées aux 3 à 5 destinations réellement principales du produit, pas accumuler tous les menus.

Principes :

1. navigation basse pour les destinations fréquentes ;
2. menu secondaire/drawer pour les fonctions rares ;
3. action principale visible sans chercher ;
4. état actif visuel à ajouter dans le produit final ;
5. préserver le contexte lors des retours/navigation ;
6. éviter les pages où l'utilisateur doit faire défiler jusqu'en haut pour agir.

## Formulaires mobile

- une colonne par défaut ;
- labels visibles ;
- bons `type`, `inputMode` et autocomplete ;
- erreurs à proximité du champ ;
- bouton principal pleine largeur quand approprié ;
- pas de champ trop petit côte à côte à 320/360 px.

## Données et tables

Sur smartphone, préférer quand possible :

- cartes/listes compactes pour données clés ;
- détail sur une page dédiée ;
- tableau complet disponible avec scroll horizontal pour les vues administratives.

Ne jamais réduire la police jusqu'à rendre le tableau illisible pour le faire « rentrer ».

## Paiement mobile

Le checkout doit être testé depuis un vrai viewport mobile. Vérifier :

- sélection du provider/opérateur simple ;
- numéro de téléphone adapté au pays ;
- CTA visible ;
- retour depuis l'app Mobile Money ou la page provider ;
- état `pending` compréhensible si la confirmation tarde ;
- possibilité de reprendre le statut après retour dans le navigateur.

## Commande de contrôle statique

```bash
npm run mobile:check
```

Ce contrôle vérifie uniquement que les fondations mobile-first du starter sont présentes. Il ne remplace pas les tests visuels sur de vrais viewports/appareils.

## Règle pour l'IA

Pour chaque phase du plan d'implémentation :

1. construire le mobile d'abord ;
2. valider 320/360/390/430 ;
3. corriger avant tablette/desktop ;
4. ajouter 768/1024/1440 ;
5. exécuter `npm run mobile:check` ;
6. rapporter les problèmes visuels non vérifiés au lieu de supposer qu'ils sont corrects.
