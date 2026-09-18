# MusikPro — Plan de la sélection Banani du 18 septembre 2026

## Périmètre validable

29 écrans observés (2 dashboards existants, 27 nouvelles variantes), 8 composants partagés. Sources intégrales dans `design/banani/selected-source-snapshot.json`. Routes ci-dessous proposées pour la démonstration, pas observées dans Banani. Lecture du snapshot effectué par le MCP disponible, qui ne permet pas de lister tout le projet.

Le plan a été validé par l’utilisateur (« oui »). Les 27 nouveaux écrans sont codés avec un état fictif partagé en mémoire. Les résultats et limites de validation sont consignés dans `generated/musikpro-banani-demo-validation.md`.

## RÉUTILISER / ADAPTER / CRÉER / À CONFIRMER

- RÉUTILISER : les deux dashboards et leurs 13 assets ; le layout serveur requireUser/noindex ; auth, sécurité, billing et primitives du kit.
- ADAPTER : MobileTopBar, MobileBottomNav et SongCard pour les liens locaux ; Preview pour permettre la navigation de démo ; thème/fonts pour les nouvelles routes. Préserver la barre mobile fixe et éviter un second menu starter.
- CRÉER : 27 écrans/variantes transcrits depuis les sources ; StepProgressBar, AppLogo, DesktopSidebar et autres dépendances uniquement lorsqu'elles sont utilisées ; modèle de données fictives et état local partagé ; skeletons adaptés.
- À CONFIRMER pour le réel : règles de crédits, prix, abonnement, paiement Chariow, génération musicale, droits audio, transcription, support et notifications. Aucun de ces services ne sera activé pour la démo.

Le gap analysis automatique compte 2 réutilisations et 27 créations de pages ; « ADAPTER » ci-dessus concerne les composants existants. Son compteur À CONFIRMER=0 concerne seulement les routes proposées, pas la validation des règles métier.

## Matrice des écrans

| Écran importé                                | Route locale proposée                  | Traitement |
| -------------------------------------------- | -------------------------------------- | ---------- |
| Contacter le support                         | `/dashboard/support`                   | Créer      |
| Écran de génération musicale                 | `/dashboard/payment-preview/confirmed` | Créer      |
| Aide & FAQ                                   | `/dashboard/help`                      | Créer      |
| Mes Chansons Générées                        | `/dashboard/songs`                     | Créer      |
| Centre de notifications                      | `/dashboard/notifications`             | Créer      |
| Redirection Paiement Chariow                 | `/dashboard/payment-preview/chariow`   | Créer      |
| Profil Utilisateur (Next)                    | `/dashboard/profile/next`              | Créer      |
| Crédits - Acheter des Chansons               | `/dashboard/credits`                   | Créer      |
| Découvrir — Bibliothèque                     | `/dashboard/discover`                  | Créer      |
| Étape 5 — Édition des paroles                | `/dashboard/create/lyrics/edit`        | Créer      |
| Éditer le profil                             | `/dashboard/profile/edit`              | Créer      |
| Étape 7 — Générer ma chanson                 | `/dashboard/create/confirm`            | Créer      |
| Mes Favoris - Chansons Aimées                | `/dashboard/favorites`                 | Créer      |
| Mes chansons                                 | `/dashboard/songs/overview`            | Créer      |
| Paramètres de notifications                  | `/dashboard/settings/notifications`    | Créer      |
| Page de Paiement                             | `/dashboard/payment-preview`           | Créer      |
| Étape 5 — Révision des paroles               | `/dashboard/create/lyrics`             | Créer      |
| Paramètres - Apparence et Langue             | `/dashboard/settings`                  | Créer      |
| Créer une Chanson - Sélection Genre          | `/dashboard/create/genre`              | Créer      |
| Étape 1 — Choisir une occasion               | `/dashboard/create`                    | Créer      |
| Lecteur de chanson                           | `/dashboard/songs/player`              | Créer      |
| Étape 4 — Paramètres additionnels            | `/dashboard/create/parameters`         | Créer      |
| Étape 4 — Génération des paroles (Animation) | `/dashboard/create/lyrics/generating`  | Créer      |
| Étape 2 — Raconte ton histoire               | `/dashboard/create/story`              | Créer      |
| Étape 3 — Choisis le style et l'ambiance     | `/dashboard/create/style`              | Créer      |
| Menu Utilisateur Mobile                      | `/dashboard/menu`                      | Créer      |
| Profil Utilisateur                           | `/dashboard/profile`                   | Créer      |
| Dashboard Utilisateur Desktop                | `/dashboard`                           | Réutiliser |
| Dashboard Utilisateur Mobile                 | `/dashboard`                           | Réutiliser |

## Phase 1 — Sources et fondations de démonstration

- Import/check/analyze/plan : effectués. Vérifier les nouveaux tokens contre DESIGN-SYSTEM.md sans écraser les variantes des maquettes.
- Reprendre les JSX et classes d'origine ; remplacer uniquement les imports Banani par les adaptateurs locaux, typer les props/données, garder les motifs spécifiques.
- Partager chargement de DM Sans et thème sur les routes de ce lot ; limiter la portée des resets.
- Réutiliser le layout /dashboard pour requireUser et noindex. Aucun endpoint, table, migration ou provider nouveau.
- Créer `lib/demo/musikpro-data.ts` : profil de démo, chansons/versions, crédits fictifs, favoris, notifications et paroles. Préserver les quantités/textes nécessaires aux variantes sources ; relier les chansons par identifiant stable, sans faire passer leurs compteurs pour des mesures réelles.
- Context client de démo en mémoire, réinitialisable à l'actualisation ; aucune écriture Neon. Une normalisation éditoriale globale n'est pas incluse.
- Gate : import-banani:check, features:check, ui:icons-check ; vérifier absence de secret dans les sources/props.

## Phase 2 — Navigation et bibliothèque

- Relier Accueil, Découvrir, Créer, Mes chansons et Crédits ; menu haut vers Menu, notification vers Centre ; sidebar bureau vers destinations réellement importées.
- Chansons : conserver la liste simple et la liste avec versions en routes distinctes ; clic lecture ouvre le lecteur avec le même identifiant et la même version.
- Recherche/tri/favoris uniquement sur les collections fictives ; état favori partagé entre bibliothèque, favoris et lecteur.
- Reprendre les assets observés dans les nouvelles pages. Inventorier les manquants puis les récupérer depuis Banani lorsque accessibles ; ne pas substituer une photo arbitraire.
- Lecteur : état play/pause simulé clairement identifiable ; aucun son présenté comme chanson générée sans fichier audio réel. Actions indisponibles restent explicites.
- Gate : tester le parcours accueil → chansons → lecteur → favoris → retour ; active nav cohérente ; scroll réel, aucune barre mobile qui se déplace.

## Phase 3 — Création et paroles

- Parcours de démo proposé : occasion → histoire → style/ambiance → paramètres → génération des paroles simulée → révision → édition facultative → confirmation → chanson fictive.
- Conserver la sélection de genre bureau comme variante distincte ; ne pas modifier les compteurs 7/8/10 étapes des sources sans arbitrage.
- État partagé : occasion, histoire, genre, ambiance, langue, voix et paroles ; appliquer les bornes de texte montrées par les sources, avec schémas Zod pour les véritables champs interactifs de la démo.
- Les faux champs en div de l'export deviennent des contrôles accessibles de même géométrie lorsqu'une interaction est prévue. Les actions vocales n'accèdent pas au micro et indiquent leur statut de démonstration.
- Génération simulée à action explicite, sans délai artificiel, appel IA ni consommation réelle de crédit. Garder l'écran d'animation importé consultable comme variante.
- Gate : choix et textes conservés entre pages ; retour sans perte d'état dans la session ; saisie clavier et erreurs ; reduced-motion ; validation:zod-check.

## Phase 4 — Profil, paramètres, notifications et support

- Profil et Profil Next conservés séparément ; édition du profil fictif sans toucher au compte Better Auth.
- Toggles et choix de paramètres modifient uniquement l'état local de démonstration ; ne pas promettre de configuration serveur ou de thème sombre complet.
- Accordéons FAQ natifs conservés ; liens aide/support locaux ; message de support validé localement et confirmation explicite « simulation, aucun message envoyé ».
- Notifications : lecture/marquer tout dans la collection de démo ; aucun email/push envoyé.
- Mot de passe/déconnexion : ne pas changer un identifiant ni créer une seconde auth. Réutiliser les routes/helpers existants pour tout comportement réel explicitement inclus ; sinon indiquer l'action de démo.
- Gate : édition locale, FAQ, support simulé, toggles et notifications ; aucun envoi externe ni mutation de compte.

## Phase 5 — Crédits et maquettes de paiement

- Afficher packs, historique, commande, Chariow et confirmation importés dans les routes payment-preview.
- Relier choix pack → résumé de commande fictive → maquette de redirection → confirmation simulée ; bouton de simulation explicitement libellé pour éviter de présenter un paiement réel.
- Aucune navigation externe Chariow, aucun SMS, aucun crédit réel accordé. Le module /dashboard/billing et les providers du kit restent les propriétaires du paiement réel.
- GeneratingScreen affiche « Paiement confirmé » : classer selon son contenu, sans prétendre qu'il démontre une génération musicale terminée.
- Gate : montant/pack de démo cohérents dans le parcours ; retour/annuler opérationnels ; aucune requête fournisseur.

## Phase 6 — Validation de l'ensemble

- Chaque écran data-driven : loading.tsx ou Suspense avec primitives skeleton, géométrie adaptée ; états empty/error/offline/unauthorized lorsque pertinents, distingués des écrans importés.
- Validation visuelle de chaque route à 320/360/390/430/768/1024/1440 ; vérifier assets, couleurs/opacités, police/interligne, rayons/ombres, nav fixe, safe area, cibles tactiles et absence de débordement.
- Pour les écrans uniquement mobiles, reprise mobile centrée aux grandes largeurs sauf variante bureau importée ; adaptation annoncée, pas bureau inventé.
- Gates : mobile:check, ui:loading-check, ui:icons-check, validation:zod-check, refactor:check, features:check ; tests de parcours nécessaires, typecheck, lint et build.
- Distinguer erreurs nouvelles des blocages préexistants de typecheck/lint/build et audit. Ne pas annoncer la livraison complète tant que des vérifications requises restent impossibles.

## Données réelles : contrat ultérieur

La couche de démo exposera des types et accès regroupés pour remplacer les fixtures ultérieurement. Ce lot ne définit aucune nouvelle table, règle d'abonnement, permission ou API métier. Le futur branchement réel nécessitera son propre plan et les contrôles serveur du kit (auth, Zod, rate limiting, RLS, signatures et idempotence selon la fonction).

## État actuel

- Connexion Banani : CONFIGURÉE et appel MCP réussi.
- Sources et inventaire des 29 écrans : IMPORTÉS.
- Contrôle d'import et génération du plan : TESTÉS.
- Nouveaux écrans : CODÉS ; parcours de création, favoris et paiement simulé TESTÉS au navigateur.
- Responsive : géométrie et images TESTÉES sur 28 routes aux sept largeurs prescrites (196 contrôles). Comparaison pixel par pixel et audit tactile exhaustif : NON VÉRIFIÉS.
- Livraison production : BLOQUÉE par les contrôles globaux décrits dans le rapport de validation ; aucun déploiement effectué.
