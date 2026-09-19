# Design QA — parité mode démo / compte réel

**Source visual truth path:** `http://localhost:3000/demo` (mode démo, capture Browser Tools du 19 septembre 2026)

**Implementation screenshot path:** `http://localhost:3000/dashboard` (compte réel authentifié, capture Browser Tools du 19 septembre 2026)

**Viewport:** 1440 × 1000 CSS px, DPR 1. Captures pleine page : document réel 1425 × 1273 px, document démo 1425 × 1354 px. La différence de hauteur vient uniquement des chansons et activités présentes dans les fixtures démo.

**State:** thème clair, tableau de bord bureau, compte réel vide contre mode démo avec données. Vérification responsive complémentaire à 320, 360, 390, 430, 768, 1024 et 1440 px.

## Findings

- Aucun écart P0, P1 ou P2 restant.
- La carte de solde est désormais le même composant dans l’accueil et dans le rail latéral des autres pages. Ses dimensions mesurées sont identiques dans les deux modes : 320 × 205 px à 1440 px.
- La structure Accueil, Concours, Mes chansons, Témoignages, Tendances, solde et Activité récente est identique. Les comptes sans contenu utilisent les états vides au même emplacement ; les données futures réutiliseront les cartes du mode démo.
- Le répertoire technique d’écrans qui n’existait que dans le mode démo a été retiré afin de préserver la parité visuelle.

## Required fidelity surfaces

- **Fonts and typography:** DM Sans, graisses, tailles, interlignages et hiérarchie proviennent des mêmes composants et tokens dans les deux modes.
- **Spacing and layout rhythm:** mêmes grilles, espacements, rayons, ombres et largeur de rail. Aucun débordement horizontal sur les sept viewports requis.
- **Colors and visual tokens:** mêmes variables `--color-*`, gradients, bordures et états sémantiques. Seuls le nombre de crédits et les textes d’état changent.
- **Image quality and asset fidelity:** les images éditoriales et portraits fictifs restent réservés au mode démo. Le compte réel utilise les initiales de la personne et des états vides dans les mêmes cartes.
- **Copy and content:** les libellés de navigation et de cartes sont identiques ; le nom, le solde, les chansons et les activités restent propres au compte.

## Full-view comparison evidence

Les captures Browser Tools réel/démo à 1440 × 1000 montrent la même composition. La carte de solde, le CTA, le concours, le rail de tendances et les témoignages sont alignés aux mêmes positions. Les variations visibles correspondent uniquement aux états vide/rempli.

## Focused region comparison evidence

La carte « Votre solde / Chansons disponibles » a été comparée isolément : même composant `WorkspaceBalanceCard`, même classe `workspace-credit-card`, même taille 320 × 205 px, même bouton et même hiérarchie dans les deux modes.

## Primary interactions tested

- Navigation réelle et démo sur Accueil, Découvrir, Mes chansons, Favoris, Packs, Profil, Paramètres et le parcours de création.
- Affichage des états vide et rempli.
- Isolation des fixtures : aucune chanson, tendance, collection, transaction, parole, notification, concours ou photo de profil fictive n’est injectée dans un compte réel.
- Absence de scroll horizontal global aux largeurs 320, 360, 390, 430, 768, 1024 et 1440 px.
- Console : aucun défaut applicatif observé. Chrome signale seulement l’attribut `bis_skin_checked` injecté par une extension locale.

## Comparison history

- **P1 initial — carte Packs divergente :** l’accueil utilisait une grande carte spécifique, alors que les autres pages utilisaient la carte de solde raffinée. Correction : extraction et utilisation commune de `WorkspaceBalanceCard`.
- **P2 initial — structure réelle plus courte :** les sections éditoriales étaient masquées hors démo. Correction : structure commune, avec états de données vides pour les contenus personnels.
- **P2 initial — navigation technique visible seulement en démo :** correction par suppression du répertoire technique du rendu utilisateur.
- **Post-fix evidence :** parité structurelle confirmée sur 15 routes et parité responsive confirmée sur les sept viewports requis.

## Implementation checklist

- [x] Composant de solde partagé.
- [x] Sections communes aux deux modes.
- [x] Activité réelle alimentée par les chansons du compte, avec état vide.
- [x] Solde réel alimenté par Neon, sans valeur de démonstration.
- [x] Catalogues fictifs retirés du tableau de bord propriétaire.
- [x] Packs, historique, bibliothèque, tendances, témoignages, concours et paroles de démonstration isolés sous `/demo`.
- [x] Navigation technique retirée du mode démo.
- [x] Responsive et absence de débordement vérifiés.

**final result: passed**
