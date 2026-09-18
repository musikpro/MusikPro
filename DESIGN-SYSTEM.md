# MusikPro — Design system

Version 2 · 18 septembre 2026 · Référence visuelle pour les futures pages.

## Modernisation demandée après import

### Variantes bureau dérivées du dashboard

Les 27 routes complémentaires possèdent une vraie composition bureau à partir de 1024 px : sidebar de navigation de 210 px (230 px à partir de 1280 px), en-tête, contenu central flexible et panneau droit de 220/260 px. Le panneau accompagne la création avec un résumé des choix ; ailleurs il propose crédits, dernières créations et aide. Le dashboard original conserve sa variante bureau importée. Les compositions complémentaires sont des adaptations demandées par l’utilisateur, pas des écrans bureau observés dans Banani.

Le contenu central utilise une carte de rayon 28 px, sans limitation à une largeur de téléphone. Réglages et actions profil passent en deux colonnes à 1280 px, chansons en deux colonnes à 1440 px ; le lecteur sépare pochette et commandes à 1280 px. La sélection de genre ne duplique plus la sidebar. Les skeletons reprennent le même cadre bureau. En dessous de 1024 px, les panneaux latéraux sont masqués et la navigation basse reste fixe ; les entrées du menu mobile deviennent des cartes tactiles. Les dimensions sont documentées dans le catalogue de tokens.

L’utilisateur a demandé une évolution visuelle cohérente, plus profonde et animée. La couche `.musik-modern` est une adaptation explicite ; les snapshots Banani restent conservés comme références originales. Fond ambiant orange à 9 % et corail à 6 %, cartes avec ombre `0 8px 28px rgb(70 43 23 / 6%)` et lumière discrète, hero de création dégradé `#b83d13 → #ed6826 → #f69962` avec anneaux graphiques. Les titres utilisent un tracking de -0,025 em. Le gris secondaire clair devient `#736a62` pour renforcer sa lisibilité.

La navigation fixe est translucide à 92 %, floutée à 20 px ; aucun parent transformé n’est ajouté pour préserver son ancrage au viewport. Entrée de sections par opacité (350 ms), cartes par opacité et déplacement de 8 px (400 ms), survol par ombre (220 ms), réservé aux pointeurs précis. `prefers-reduced-motion` désactive les animations et transitions. Aucun mouvement permanent décoratif. Les tokens complémentaires sont consignés dans `design/banani/design-tokens.json`.

Les dashboards réutilisent maintenant le profil et les chansons du même état fictif que les autres pages. Le badge crédits ouvre les crédits ; langue ouvre les paramètres ; vue d’ensemble ouvre les versions. Le répertoire des écrans emploie de vrais liens Next.js, permettant également leur ouverture dans un nouvel onglet.

## 1. Périmètre et autorité

Ce document analyse les **deux dashboards utilisateur importés de Banani**, mobile et bureau. Il définit leur vocabulaire commun et les règles permettant de prolonger leur style. Il ne remplace ni les écrans importés ni leurs compositions particulières. Il ne prétend pas décrire les autres écrans du projet Banani.

Ordre de décision pour toute nouvelle page :

1. Respecter les exigences de sécurité, d’accessibilité et les demandes explicites de l’utilisateur.
2. Reproduire l’écran Banani réellement importé pour cette page : composition, proportions, variantes, images et détails spécifiques.
3. Utiliser ce design system pour ses éléments communs et les détails absents de cet écran.
4. Proposer explicitement les éléments entièrement nouveaux ; ne pas les présenter comme observés dans Banani.

Une différence avec un nouvel écran ne justifie **jamais** de remplacer cet écran par la composition du dashboard. Inventorier la différence, conserver la variante locale, puis enrichir ce document si elle constitue un motif réutilisable. Ne pas changer un token global pour résoudre une exception locale. En cas de contradiction non résolue entre deux exports, conserver les sources et demander un arbitrage sur le détail concerné.

### Provenance et niveau de preuve

| Source                                                                      | Rôle                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `design/banani/mcp-source-snapshot.json`                                    | Export MCP des deux écrans et de leurs dépendances ; référence importée                      |
| `components/banani/UserDashboardMobile.tsx`                                 | Composition mobile transcrite depuis l’export                                                |
| `components/banani/UserDashboardDesktop.tsx`                                | Composition bureau transcrite depuis l’export                                                |
| `components/banani/MobileTopBar.tsx`, `MobileBottomNav.tsx`, `SongCard.tsx` | Composants communs observés                                                                  |
| `app/dashboard/banani.css`                                                  | Tokens et adaptations CSS réellement utilisés                                                |
| `components/banani/assets.json`, `public/banani/`                           | Correspondances et 13 images/portraits importés                                              |
| `design/banani/design-tokens.json`                                          | Catalogue lisible par les outils ; documentation, pas un deuxième thème chargé à l’exécution |

**OBSERVÉ** = présent dans les sources importées. **ADAPTATION** = décision de l’implémentation actuelle, dont la barre fixe demandée par l’utilisateur. **DIRECTIVE** = règle de livraison pour les prochaines pages. **NON VÉRIFIÉ** = absent des sources ou non mesuré. Les valeurs CSS indiquées sont issues du code ; elles ne constituent pas une preuve de comparaison pixel par pixel avec Banani.

## 2. Identité visuelle

Interface claire, chaleureuse et musicale. Le fond crème fait ressortir des cartes blanches. L’orange désigne les actions principales, les éléments actifs et les crédits. Les tons pêche servent aux accompagnements de ces actions. Le texte presque noir porte la hiérarchie ; le gris chaud porte les informations secondaires.

Les silhouettes sont douces : grandes surfaces arrondies, blocs aérés, pictogrammes fins, photographies de scènes musicales africaines. Les grandes ombres sont réservées à la création et à la navigation flottante. Les cartes de contenu utilisent une bordure discrète, parfois une ombre très faible. Aucun mode sombre n’est observé ; ne pas en déduire une palette sombre.

## 3. Couleurs et rôles sémantiques

Les 17 tokens suivants sont OBSERVÉS dans le thème exporté. Utiliser le rôle sémantique, même lorsque deux valeurs sont identiques.

| Token CSS                      | Valeur    | Emploi                                                          |
| ------------------------------ | --------- | --------------------------------------------------------------- |
| `--color-background`           | `#FAFAF7` | Fond général, barre haute mobile, structure bureau              |
| `--color-foreground`           | `#1A1A1A` | Titres et texte principal                                       |
| `--color-border`               | `#E8E3DC` | Contours de cartes, séparateurs, sidebar et en-tête             |
| `--color-input`                | `#F3EFE9` | Token disponible ; aucun champ de saisie observé                |
| `--color-primary`              | `#F26522` | Création, lecture, navigation active, liens et crédits          |
| `--color-primary-foreground`   | `#FFFFFF` | Texte/pictogrammes sur primaire                                 |
| `--color-secondary`            | `#FDE8D8` | Vignette musicale, nav active bureau, badge crédits, dégradés   |
| `--color-secondary-foreground` | `#F26522` | Texte accompagnant les fonds secondaires                        |
| `--color-coral`                | `#F4845F` | Token disponible, usage visible non démontré sur ces deux pages |
| `--color-coral-foreground`     | `#FFFFFF` | Contenu sur coral, usage non démontré                           |
| `--color-muted`                | `#EDE8E2` | Token disponible, usage explicite non démontré                  |
| `--color-muted-foreground`     | `#8C8782` | Métadonnées, menus inactifs, sous-titres                        |
| `--color-success`              | `#22C55E` | Token disponible ; aucun état de succès visible observé         |
| `--color-success-foreground`   | `#FFFFFF` | Contenu sur success, usage non démontré                         |
| `--color-card`                 | `#FFFFFF` | Cartes, petits boutons neutres, navigation basse                |
| `--color-card-foreground`      | `#1A1A1A` | Texte sur cartes                                                |
| `--color-surface`              | `#F7F3EE` | Token disponible, usage explicite non démontré                  |

Couleurs additionnelles OBSERVÉES : noir et blanc pour les boutons stores et les images ; `yellow-500` pour les notes des témoignages ; `red-400` puis `red-500` au survol pour la déconnexion. Ces couleurs sont actuellement des utilitaires Tailwind, pas des tokens MusikPro de feedback. Ne pas considérer le rouge de déconnexion comme une palette d’erreur complète. La valeur exacte des utilitaires dépend du thème Tailwind installé.

### Contrastes calculés et limites

Rapports calculés sur les aplats hexadécimaux, sans mesurer le contenu des photographies :

| Paire                             | Rapport | Conséquence                                                                     |
| --------------------------------- | ------- | ------------------------------------------------------------------------------- |
| Texte principal / fond général    | 16,64:1 | Très lisible                                                                    |
| Texte secondaire / blanc          | 3,56:1  | Insuffisant pour le texte courant à 4,5:1                                       |
| Texte secondaire / fond général   | 3,40:1  | Même limite                                                                     |
| Orange / blanc, ou blanc / orange | 3,15:1  | Insuffisant pour les petits textes ; seuil de 3:1 pour le grand texte seulement |
| Orange / pêche secondaire         | 2,66:1  | Insuffisant même pour le grand texte                                            |

DIRECTIVE : contrôler chaque couple selon la taille, la graisse et la fonction. Ne pas déclarer WCAG AA globalement validé. Une correction de contraste doit être une variante documentée et revue visuellement, sans altération silencieuse de l’import. Les textes blancs à 70/80 % sur orange et les textes sur images nécessitent un contrôle spécifique. Les petits badges ne sont pas exemptés du contraste.

## 4. Opacités, dégradés et transparence

L’opacité porte généralement sur **la couleur du fond ou du texte**, pas sur l’ensemble du composant. Ne pas appliquer `opacity` au parent d’un CTA, ce qui atténuerait également son contenu.

| Élément                                    | Traitement OBSERVÉ                                                 |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Carré du plus dans le CTA                  | Blanc à 20 % sur orange                                            |
| Sous-titre du CTA                          | Blanc à 80 %                                                       |
| Chevron du CTA                             | Blanc à 70 %                                                       |
| Contours concours, crédits, téléchargement | Orange à 20 %, bordure 1 px                                        |
| Tendances mobile                           | Dégradé vers le haut, noir à 60 % en bas → transparent en haut     |
| Tendances bureau                           | Même direction, noir à 70 % en bas → transparent en haut           |
| Métadonnées sur photographie               | Blanc à 70 %                                                       |
| Concours                                   | Dégradé horizontal gauche → droite, pêche secondaire → blanc       |
| Crédits bureau                             | Dégradé haut gauche → bas droite, pêche secondaire → blanc         |
| Téléchargement mobile                      | Dégradé haut gauche → bas droite, orange à 10 % → pêche secondaire |

Aucun flou d’arrière-plan, verre translucide ou filtre photographique n’est spécifié dans ces sources. Les dégradés n’impliquent pas une troisième couleur de marque. Leur interpolation effective dépend du moteur Tailwind/navigateur ; les classes originales restent la référence.

## 5. Typographie

Famille unique : **DM Sans**, corps et titres. Implémentation locale `@fontsource/dm-sans`, graisses chargées 400, 500, 600 et 700 ; repli `sans-serif`. Ne pas remplacer par une police visuellement proche. Aucun italique, capitalisation systématique ou espacement de lettres personnalisé n’est observé.

| Classe/token | Taille | Emploi dans les écrans                                                 |
| ------------ | ------ | ---------------------------------------------------------------------- |
| `text-xs`    | 11 px  | Métadonnées, labels navigation mobile, compteur, sous-titre CTA mobile |
| `text-sm`    | 13 px  | Texte témoignages, liens, nav bureau, sous-titres                      |
| `text-base`  | 15 px  | Titre SongCard, CTA mobile, concours bureau, logo mobile               |
| `text-lg`    | 17 px  | Titres de sections, CTA bureau, logo bureau                            |
| `text-xl`    | 20 px  | Salutation bureau                                                      |
| `text-2xl`   | 24 px  | Salutation mobile                                                      |
| `text-3xl`   | 30 px  | Trophée du concours mobile masqué                                      |
| `text-4xl`   | 38 px  | Trophée du concours bureau                                             |
| `text-5xl`   | 52 px  | Nombre de crédits bureau                                               |

Sous 360 px, ADAPTATION actuelle : `text-base` devient 14 px dans la variante mobile. Ne pas généraliser cette exception à tous les nouveaux écrans.

Graisses : 400 pour le corps et les métadonnées ; 500 pour la navigation bureau inactive et les actions d’activité ; 600 pour les titres de chansons, liens et auteurs ; 700 pour les titres de sections, CTA, logo et grand compteur.

### Interlignage : détail d’implémentation

Le conteneur définit un interlignage de 1,5. Les classes de taille héritent cependant des ratios de Tailwind, car seuls les tokens de **taille** ont été remplacés. Valeurs nominales actuelles :

| Taille | Ratio de la classe | Interligne nominal |
| ------ | ------------------ | ------------------ |
| 11 px  | 1,3333             | 14,67 px           |
| 13 px  | 1,4286             | 18,57 px           |
| 15 px  | 1,5                | 22,5 px            |
| 17 px  | 1,5556             | 26,44 px           |
| 20 px  | 1,4                | 28 px              |
| 24 px  | 1,3333             | 32 px              |
| 30 px  | 1,2                | 36 px              |
| 38 px  | 1,1111             | 42,22 px           |
| 52 px  | 1                  | 52 px              |

Ces ratios sont dépendants du thème technique installé ; les préserver lors d’une reproduction. Ne pas imposer automatiquement 1,5 à tous les titres. Si une nouvelle source précise `leading-*`, conserver sa valeur locale.

Titres de chansons : une ligne avec ellipsis (`truncate`, parent `min-width:0`). Témoignages bureau : quatre lignes maximum ; mobile : texte complet. Noms/rôles bureau tronqués au besoin. Les ellipsis n’autorisent pas la suppression des noms accessibles ou des données sources.

## 6. Espacements et dimensions

Unité technique Tailwind : `0,25rem`, soit 4 px avec une racine à 16 px. Palette OBSERVÉE : **2, 4, 6, 8, 10, 12, 16, 20, 24, 32 px**. Utiliser ces valeurs pour les détails non spécifiés ; ne pas arrondir 10 px en 12 px lors d’une copie.

| Rôle                             | Mobile                           | Bureau                            |
| -------------------------------- | -------------------------------- | --------------------------------- |
| Marges latérales principales     | 16 px ; 12 px sous 360 px        | 32 px dans le contenu             |
| Espacement de sections           | Marges basses 20 ou 24 px        | Gap de 24 px entre blocs/colonnes |
| Titre → liste                    | 12 px                            | 16 px                             |
| Liste de chansons                | Gap 12 px, une colonne           | Gap 12 px, deux colonnes          |
| Grille tendances                 | Deux colonnes, gap 10 px         | Une colonne, gap 12 px            |
| Grille témoignages               | Une colonne, gap 12 px           | Trois colonnes, gap 16 px         |
| Padding carte chanson/témoignage | 16 px                            | 16 px                             |
| Padding CTA                      | 20 px horizontal, 16 px vertical | 24 px horizontal, 20 px vertical  |
| Espacement interne CTA           | 16 px                            | 20 px                             |
| Panneau crédits                  | Non présent sous cette forme     | Padding 32 px                     |

Ne pas fixer les hauteurs des cartes textuelles : elles suivent le contenu, ses retours à la ligne et les paddings. Les hauteurs réellement fixes sont documentées ci-dessous. Les marges successives ne sont pas toutes interchangeables avec un `gap` global.

## 7. Arrondis, bordures et élévation

| Classe         | Rayon réel      | Emploi                                                                   |
| -------------- | --------------- | ------------------------------------------------------------------------ |
| `rounded-sm`   | 8 px            | Token disponible                                                         |
| `rounded-md`   | 14 px           | Logo mobile                                                              |
| `rounded-lg`   | 20 px           | SongCard, vignette musicale, lecture, boutons barre haute, items sidebar |
| `rounded-xl`   | 32 px           | CTA, nav mobile, tendances, témoignages, concours, téléchargement        |
| `rounded-3xl`  | 24 px nominal   | Panneau crédits bureau : valeur Tailwind non remplacée                   |
| `rounded-full` | Arrondi maximal | Avatars, badges, boutons stores/achat                                    |

Attention : les noms de classes ne sont **pas une échelle de rayons croissante** après surcharge du thème. `rounded-3xl` reste ici inférieur à `rounded-xl`. Ne pas les uniformiser sans décision visuelle.

Contours : 1 px, style solid ; séparateurs 1 px également. Dégradés promotionnels : orange à 20 %. Les images sont masquées aux limites de leur conteneur arrondi (`overflow-hidden`). Les cartes ordinaires n’ont pas toutes d’ombre.

| Surface                    | Ombre OBSERVÉE                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Carte chanson              | `0 1px 8px rgba(0,0,0,0.06)`                                                                                      |
| CTA création               | `0 4px 20px rgba(242,101,34,0.35)`                                                                                |
| Navigation basse           | `0 4px 24px rgba(0,0,0,0.10)`                                                                                     |
| Action centrale navigation | `0 4px 16px rgba(242,101,34,0.40)`                                                                                |
| Achat crédits au survol    | `shadow-lg` Tailwind : deux ombres nominales `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |

## 8. Composition responsive et navigation

### Variante mobile OBSERVÉE

Ordre : barre haute → salutation → création → chansons → tendances → téléchargement → témoignages → navigation basse. Le concours existe dans le JSX mais porte `hidden` : **il n’est pas visible sur ce dashboard mobile**. Ne pas l’ajouter au mobile au seul motif qu’il existe au bureau.

Barre haute : padding 16 px horizontal/12 px vertical ; boutons menu et notification 36 × 36 px, rayon 20 px ; logo 28 × 28 px, rayon 14 px ; badge crédits pêche avec padding 12 × 6 px ; point notification orange de 8 px.

Navigation basse : cinq positions, dont une action centrale de création ; fond blanc, contour crème, rayon 32 px, padding source 8 px. Icônes ordinaires 22 px, labels 11 px ; actif orange et graisse 600, inactif gris chaud. Bouton central orange 56 × 56 px, rayon 32 px, décalé vers le haut par une marge de −24 px, plus blanc de 28 px. Badge crédits orange 20 × 20 px, texte blanc 11 px/700, position source −4 px haut/droite.

**ADAPTATION obligatoire demandée par l’utilisateur :** navigation fixée au viewport pendant tout le défilement (`position:fixed`, `z-index:50`), inset latéral 16 px, inset bas `16px + env(safe-area-inset-bottom,0px)`. Réserver `110px + safe area` sous le contenu. Le bouton central doit pouvoir dépasser sans être coupé. Sous 360 px, padding horizontal nav/boutons réduit à 4 px et items flexibles ; badge final ramené à droite 0. Les labels peuvent prendre deux lignes aux petites largeurs : aucune hauteur unique de barre ne doit être imposée.

### Variante bureau OBSERVÉE

Sidebar gauche de 240 px ; contour droit, padding 24 px vertical/16 px horizontal. Logo 32 × 32 px. Trois groupes de navigation séparés par des traits ; langue et déconnexion en bas via un espace flexible. Items : padding 12 × 10 px, gap 12 px, rayon 20 px, texte 13 px. Actif pêche/orange, graisse 600 ; inactif gris/500, texte principal au survol. La sidebar n’est pas spécifiée comme fixe ou sticky dans les sources.

En-tête de 64 px, contour bas, padding horizontal 32 px, salutation à gauche, notification et avatar à droite. Contenu : colonne centrale flexible avec `min-width:0`, panneau droit de 320 px, gap 24 px. Le panneau droit contient crédits → tendances → activité. Le téléchargement mobile n’est pas présent dans la composition bureau.

### Breakpoints ADAPTÉS dans l’application

| Largeur             | Rendu actuel                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| 320–359 px          | Mobile compact : marges contenu 12 px, `text-base` 14 px                    |
| 360–767 px          | Mobile, marges contenu 16 px                                                |
| 768–1099 px         | Composition mobile centrée, largeur max 540 px ; nav fixe centrée de 508 px |
| À partir de 1100 px | Composition bureau, navigation mobile masquée                               |

Ces seuils sont des décisions d’intégration, pas des breakpoints prouvés par Banani. Toute nouvelle page doit être vérifiée à **320, 360, 390, 430, 768, 1024 et 1440 px**. Aucun scroll horizontal global. Une navigation fixe ne doit pas être placée sous un ancêtre transformé/filtré qui déplacerait son référentiel. Ne pas cumuler la nav starter et la nav Banani sur la même page.

## 9. Catalogue des composants

### Création principale

Bloc orange pleine largeur, rayon 32 px et ombre orange. Mobile : carré du plus 40 × 40 px/rayon 20 px, icône 22 px, titre 15 px/700, sous-titre 11 px, chevron 18 px. Bureau : carré 48 × 48 px/rayon 32 px, plus 24 px, titre 17 px/700, sous-titre 13 px, chevron 20 px. Alignement horizontal, texte à gauche, éléments décoratifs sans rétrécissement. Ne pas en faire le style par défaut de tous les boutons.

### SongCard

Carte blanche, contour 1 px, rayon 20 px, padding 16 px, gap 12 px, ombre légère. Vignette 48 × 48 px pêche, rayon 20 px, note orange 22 px. Zone textuelle flexible `min-width:0` ; titre 15 px/600 ; ligne genre/occasion 11 px, gap 8 px, marge haute 2 px ; statistiques 11 px, gap 12 px, marge haute 4 px, pictogrammes 11 px. Lecture : 40 × 40 px orange, rayon 20 px, pictogramme blanc 16 px. Réutiliser le composant partagé, sans recopier une variante divergente par page.

### Tendance photographique

Mobile : image carrée 1:1, rayon 32 px, deux colonnes. Bureau : bannière de hauteur 112 px, source 16:9 recadrée en cover, largeur de colonne 320 px. Ne pas déduire une hauteur de 180 px du ratio source au bureau : le conteneur impose 112 px. Texte bas gauche dans l’overlay, padding 12 px ; titre 11 px mobile/13 px bureau, graisse 700 ; lectures 11 px et casque 10 px. Lecture haut droite inset 8 px, bouton 32 × 32 px/rayon 20 px, play 12 px.

### Témoignage

Carte blanche, contour, rayon 32 px, padding 16 px, sans ombre explicite. Icônes de notation 14 px, gap 2 px ; marge sous note 8 px mobile/12 px bureau. Corps 13 px ; marge sous texte 12 px mobile/16 px bureau. Avatar circulaire 32 px mobile/40 px bureau. Auteur 11 px/600 mobile ou 13 px/600 bureau ; rôle 11 px gris. L’étoile représente une note réelle dans la composition, pas un décor associé à l’IA. Les exemples actuels sont fictifs, pas des avis vérifiés.

### Crédits bureau

Panneau dégradé pêche/blanc, contour orange 20 %, rayon Tailwind `3xl` (24 px nominal), padding 32 px. En-tête : zap 20 px, titre 17 px/700, gap 8 px. Nombre 52 px/700 orange ; description 13 px gris. Achat pleine largeur orange, texte blanc/600, padding vertical 12 px, arrondi maximal et ombre au survol. Aucune tarification ni intégration paiement ne découle de ce bloc.

### Concours bureau

Dégradé horizontal pêche/blanc, rayon 32 px, contour orange 20 %, padding 20 px, gap 16 px. Trophée en emoji 38 px : rendu dépendant de l’OS, pas un asset identique garanti. Titre 15 px/700, détail 13 px gris. Participation : pêche/orange, rayon 20 px, padding 20 × 10 px, texte 13 px/700. Dates et récompenses sont des données de démonstration.

### Téléchargement mobile

Panneau dégradé orange 10 %/pêche, contour orange 20 %, rayon 32 px, padding 20 px. Titre 17 px/700, description 13 px ; deux boutons noirs de même largeur, gap 12 px, rayon maximal, padding 16 × 12 px, texte blanc 13 px/600, symbole 20 px. Les SVG portent des commentaires « Official Logo » dans l’export, ce qui ne certifie pas leur conformité aux marques. Ne pas annoncer d’application publiée ni de lien store réel depuis ces exemples.

### Activité bureau

Conteneur blanc, rayon 32 px, contour, overflow masqué. Lignes padding 12 px, gap 12 px, séparateurs à partir de la deuxième ligne. Vignette pêche 32 px/rayon 20 px, zap orange 13 px. Action 13 px/500, chanson et date 11 px gris ; textes tronqués, date sans rétrécissement. Ne pas inférer un système d’événements backend de cette liste.

## 10. Iconographie, images et contenus

Adaptateur actuel : Lucide, trait de 2 px, sans remplissage ajouté, SVG sans rétrécissement. Taille choisie par fonction, pas une taille globale : 10/11 px pour métadonnées, 12/16 px pour lecture, 14 px badges/notes, 17 px sidebar, 18/20 px notifications, 22 px navigation mobile, 22/24/28 px plus selon contexte.

Icônes sémantiques : maison/accueil, boussole/découvrir, plus/créer, musique/chansons, zap/crédits, cloche/notifications, casque/lectures, cœur/favoris, layers/versions. Le fallback générique Music dans l’adaptateur est une protection technique : vérifier toute nouvelle icône pour éviter un remplacement involontaire. Aucune icône Sparkle/Wand ni glyphe décoratif équivalent n’est autorisé.

Images : réutiliser les fichiers importés quand la source l’exige ; conserver ratio, crop, ordre et prompt de correspondance. Avatars circulaires en cover. Les scènes africaines chaleureuses constituent un motif observé, pas une permission de générer ou remplacer les assets lors d’une copie. Ajouter des `alt` descriptifs en français pour les futurs assets porteurs d’information ; éviter d’exposer un prompt technique comme texte produit.

Ton des contenus : français direct, titres courts, nom MusikPro. Tutoiement dans les salutations, vouvoiement dans le téléchargement : les sources ne démontrent pas une règle linguistique unique. Conserver les textes d’un écran importé ; une normalisation éditoriale doit être distincte. Quelques témoignages bureau mentionnent « Musika » dans la source : anomalie éditoriale, pas une deuxième marque approuvée.

## 11. Interactions, mouvement et états manquants

OBSERVÉ : menus bureau inactifs passent du gris au texte principal au survol ; déconnexion rouge 400 → 500 ; achat crédits ajoute une ombre avec `transition-shadow`. Durée/easing techniques par défaut Tailwind : 150 ms, `cubic-bezier(0.4,0,0.2,1)`. Aucun déplacement, zoom, animation d’entrée, effet sonore ou hover mobile n’est spécifié.

Les deux écrans ne décrivent **pas** les modales, formulaires, recherche, validation, erreurs de génération, paiement, notifications ouvertes, états pressed/disabled/focus, mode hors ligne ou états vides. Le token `input` ne suffit pas à définir un formulaire. Ne pas inventer leur style comme s’il était importé.

DIRECTIVES pour compléter un nouvel écran :

- Prévoir loading, empty, error, unauthorized et offline séparément lorsque pertinents. Employer les primitives skeleton du kit ; géométrie proche du contenu, sans délai artificiel, avec réduction des animations si `prefers-reduced-motion`.
- Décrire les variantes focus, hover, pressed et disabled du composant avant livraison. Ajouter un focus visible, libellé accessible des boutons à icône seule et état actif accessible de la navigation. L’export actuel ne démontre pas ces variantes.
- Viser des cibles tactiles d’au moins 44 × 44 px ; plusieurs boutons observés font 32/36/40 px. Étendre la zone interactive sans déformer le visuel, puis vérifier qu’elle ne chevauche pas la voisine.
- Formulaires nouveaux : une colonne mobile, labels visibles, erreurs près du champ, validation serveur Zod. Aucun style précis de formulaire n’est figé par ces dashboards.
- Maintenir un H1 de page et des H2 de section, contrastes contrôlés, navigation clavier, safe areas et absence de contenu caché par la barre basse.

L’implémentation de démonstration actuelle possède un skeleton et un écran d’erreur, qui sont des adaptations du kit ; elle ne prouve pas tous ces états ou critères. Les clics affichent un message de démonstration : cela ne constitue pas une interaction métier définitive.

## 12. Règles d’intégration et d’évolution

Le thème exécutable reste `app/dashboard/banani.css`. Le JSON de tokens documente les valeurs, sans être injecté en parallèle. Pour une nouvelle page hors dashboard, prévoir explicitement le partage du thème et des fonts : ne pas compter sur le chargement préalable de `/dashboard`. Toute extraction en thème commun devra conserver les valeurs et isoler les règles propres à la composition du dashboard.

Conserver l’ordre de couches `theme, base, components, utilities`. Les resets sont limités à `.banani-copy` ; ne pas appliquer une réinitialisation globale au starter. Les correctifs scoped des grilles protègent les colonnes/gaps contre les styles `.grid` du kit ; les garder tant que cette collision existe. Ne pas recopier ces correctifs arbitrairement dans chaque page.

Avant l’implémentation d’un nouvel import : lire `DESIGN.md` et ce document, inventorier les sources, identifier les composants réutilisables, lister les écarts et les états non observés, puis produire le plan d’implémentation conformément au workflow Banani. Une maquette n’autorise pas à créer des permissions, endpoints, paiements ou modèles de données non démontrés.

À chaque évolution commune : mettre à jour le thème exécutable, ce document et `design/banani/design-tokens.json` dans le même changement. Pour une exception : documenter écran, source, valeur et raison, puis créer une variante locale. Ne pas reclassifier automatiquement une couleur ou un rayon isolé comme token universel.

### Checklist de livraison d’une future page

1. Source Banani identifiée ; composition et détails spécifiques préservés.
2. Tokens communs réutilisés ; nouveaux motifs et divergences documentés.
3. Police locale, graisses, tailles, interlignages, opacités, contours, rayons et ombres contrôlés.
4. Images réelles, ratio/crop et ordre respectés ; données fictives identifiables.
5. Viewports 320/360/390/430/768/1024/1440 vérifiés dans le navigateur, avec scroll réel et contrôles clavier/tactiles appropriés.
6. Navigation basse immobile pendant le scroll sur mobile, safe area conservée, dernier contenu accessible.
7. Loading/empty/error et autres états pertinents couverts ; détails non observés explicitement distingués.
8. Gates du kit exécutés selon le changement : `mobile:check`, `ui:icons-check`, `validation:zod-check`, `refactor:check`, puis tests/build et gates spécialisés applicables.
9. Ne déclarer ni fidélité pixel parfaite, ni AA, ni interactions complètes sans preuve réelle.

## 13. Historique

| Date              | Évolution                                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18 septembre 2026 | V1 extraite des deux dashboards ; tokens, composants, variantes, limites de contraste et règles de futurs imports documentés ; navigation mobile fixe intégrée comme demande explicite                                                             |
| 18 septembre 2026 | Lot de 27 nouveaux écrans transcrit selon ses sources ; grilles adaptées sur mobile, démonstrations signalées et icône Mystique remplacée par une lune pour respecter le gate. Sources et limites : `generated/musikpro-banani-demo-validation.md` |

### Défilement du menu bureau

La sidebar utilise le fond `input` pour se distinguer du contenu. Aucun scroll interne ni scrollbar/flèches : elle défile avec le document puis devient sticky à `min(0, hauteur viewport − hauteur menu)` afin de conserver son dernier élément visible. Un ResizeObserver réévalue ce seuil lors des changements de dimensions ; aucun listener de scroll permanent. `align-self: flex-start` évite son étirement sur toute la hauteur du dashboard. Les menus plus courts que l’écran restent ancrés en haut.
