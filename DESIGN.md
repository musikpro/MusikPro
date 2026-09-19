# DESIGN.md — Africa SaaS Kit

Ce fichier est le point d'entrée du design system pour Banani, Figma et les agents de code.

## Référence MusikPro pour les espaces client et propriétaire

Lire [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) avant toute nouvelle page ou intégration Banani. La version 3 consolide les couleurs, DM Sans, tailles/interlignages, opacités, dégradés, espacements, rayons, ombres, shell responsive, navigation, formulaires, sélecteurs, recherches, cartes, packs, profil, création et feedback réellement utilisés dans l’espace client. Ce vocabulaire commun doit aussi guider le tableau de bord propriétaire. Le catalogue structuré est [design-tokens.json](./design/banani/design-tokens.json).

Chaque nouvel écran Banani reste la référence de sa propre composition et de ses détails spécifiques. Le design system guide les éléments communs et les détails absents ; il ne doit jamais remplacer ou uniformiser silencieusement un écran importé. Documenter les divergences et faire évoluer les règles communes seulement lorsqu'elles sont justifiées. Les données métier et états non observés restent À CONFIRMER / NON VÉRIFIÉS.

Pour le back-office propriétaire, reprendre le même thème orange/ivoire, les mêmes contrôles, états, focus, cartes et règles de mouvement. La densité des tableaux peut augmenter, mais elle ne crée pas un second design system. Les variantes Banani dupliquées doivent être consolidées par fonction et les mentions « crédits » traduites en nombre de chansons.

## Tokens de base

- Interface responsive mobile-first.
- Contraste WCAG AA minimum.
- États explicites : loading, empty, error, success, disabled.
- Boutons critiques distincts des actions secondaires.
- Formulaires : labels visibles, erreurs proches du champ, focus clavier visible.

## Handoff Banani

### MusikPro — import MCP observé

- Projet `QMj5OQRWpKXU` : deux variantes sélectionnées du dashboard utilisateur, mobile et desktop. Inventaire complet NON VÉRIFIÉ (outil limité aux écrans sélectionnés).
- Sources : `design/banani/mcp-source-snapshot.json`; inventaire : `design/banani/imported-design.json`.
- Fond #FAFAF7, texte #1A1A1A, primaire #F26522, secondaire #FDE8D8, bordure #E8E3DC, cartes #FFFFFF, texte secondaire #8C8782.
- DM Sans; rayons 8/14/20/32 px. Contraste à contrôler avant livraison.
- Mobile : top bar et navigation basse; desktop : sidebar et panneau secondaire. Composants observés : MobileTopBar, MobileBottomNav, SongCard.
- Chansons, crédits, concours, témoignages et statistiques sont des exemples. Les liens stores ne prouvent aucune app publiée.
- `/dashboard` est une correspondance proposée avec le starter, pas une URL confirmée par Banani. Aucun service de génération musicale démontré.
- Loading/empty/error/offline, interactions, autres écrans et responsive réel NON VÉRIFIÉS. Ne pas coder avant validation du plan et clarification métier.

Lorsque des écrans Banani sont importés, remplacer/compléter cette section avec les tokens réels : couleurs, typographies, rayons, espacements et composants.

Ne jamais traiter un export Banani comme du code backend fiable : seules les décisions visuelles sont importées automatiquement ; auth, permissions, validation serveur, paiements et secrets restent régis par l'architecture du kit.

## Mobile-first V0.8.2

Le rendu mobile est la première cible, pas une réduction du desktop. Chaque écran est validé à 320/360/390/430 px avant l'enrichissement tablette/desktop. La navigation doit rester fluide au pouce, respecter les safe areas et ne jamais provoquer de scroll horizontal global. Voir `docs/mobile/mobile-first-delivery.md` et exécuter `npm run mobile:check`.

## Loading UX

- Le chargement des pages et données doit utiliser des skeleton loaders fidèles aux écrans Banani/importés.
- Le plan d'implémentation doit lister, pour chaque écran data-driven, le fichier `loading.tsx` ou la frontière `Suspense` prévue.
- Les skeletons sont mobile-first et doivent éviter le layout shift.

## Import Banani MCP et comparaison du starter

Après connexion Banani, utiliser `/import-banani`. Cette étape doit parcourir le design disponible via MCP, produire `design/banani/imported-design.json`, comparer les écrans avec les pages/composants/features existants et générer `generated/banani-gap-analysis.md` avant le plan d’implémentation.

Le design Banani est la source de vérité visuelle ; `config/features.json` reste la source de vérité anti-doublons pour l’architecture. Une règle métier, permission, prix, workflow de paiement ou contrainte DB absente du design reste `À CONFIRMER`.

## Copie conforme de démonstration — demande utilisateur actualisée

Les deux sources JSX sont reprises directement dans components/banani avec leurs données fictives autorisées. DM Sans est distribuée localement via @fontsource; Tailwind utilise le thème MCP exact. Les 13 images/avatars observés dans Banani sont copiés localement dans public/banani. Les textes, compteurs, concours et témoignages restent des exemples de maquette. Les clics affichent un message de démonstration sans mutation ni paiement. Les anciennes décisions d’interface vide ne s’appliquent plus à cette démonstration.
