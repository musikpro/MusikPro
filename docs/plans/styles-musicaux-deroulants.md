# Styles musicaux déroulants à l'étape « style et ambiance »

- Statut : TERMINÉ
- Créé : 2026-10-11
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif / problème

L'étape « Choisis le style et l'ambiance » affiche tout le catalogue de styles musicaux d'un coup : le client se perd. Seuls les premiers styles (9 par défaut) sont montrés ; une barre sobre en dessous invite à « Voir plus de styles musicaux » et déroule le reste. Le nombre est réglable par le propriétaire.

## Réutilisation / anti-doublons

- Feature `music-style-catalog` : même source (`getActiveMusicStyles`), même ordre (glisser-déposer propriétaire), mêmes cartes ; aucun second catalogue.
- Réglage ajouté à la table existante `admin_display_settings` (réglages d'affichage, ligne unique `global`) plutôt qu'à une nouvelle table.
- Panneau dans Paramètres > Général avec `AdminActionForm` (toast), comme « Éléments par page ».

## Périmètre

- Colonne `visible_music_styles` (défaut 9, bornes 3 à 30).
- `StepStyleAndMood` : affiche les N premiers, barre de dépliage accessible (`aria-expanded`), libellés traduisibles.
- Le style déjà choisi n'est jamais caché : la liste démarre dépliée s'il est au-delà du seuil (reprise de brouillon).
- Boîte « Styles musicaux visibles » dans Paramètres > Général.

## Hors périmètre

- L'écran de bureau historique `SongCreationGenreSelection` (non utilisé dans le parcours mobile-first actuel).
- Recherche ou filtre de styles.

## Données / migrations

`0081_visible_music_styles.sql` : `ADD COLUMN IF NOT EXISTS` (idempotent, rétrocompatible). Tant qu'elle n'est pas appliquée, le getter retombe sur 9 sans casser les autres réglages. Rollback : supprimer la colonne, aucun autre effet.

## API / contrats

Server Action `setVisibleMusicStyles` (Zod, `requireAdmin`, audit). Aucune nouvelle route.

## Auth / rôles / multi-tenant

Écriture réservée aux administrateurs. Lecture serveur seule (aucune donnée utilisateur).

## Entrées non fiables / sécurité

Entier borné côté serveur (3 à 30), aucune valeur de la base ne vient du navigateur.

## Plan de tests avant code

- [x] Bornes et valeurs invalides du réglage
- [x] Découpage visible / reste, dont style choisi caché et seuils 6 et 10
- [x] Anti-régression : lint, typecheck, suite de tests, gates du kit
- [x] Vérification navigateur mobile : barre, dépliage et repli, réglage admin (enregistrement, audit)

## Critères d'acceptation

- [ ] 9 styles visibles par défaut, barre sobre en dessous, clic = déroulé du reste, « Voir moins » = repli
- [ ] Réglage modifiable dans Paramètres > Général et reflété dans le parcours
- [ ] Aucun style choisi n'est masqué ; parcours inchangé par ailleurs

## Plan d'implémentation

1. Schéma, migration, registres.
2. Logique pure `lib/music-styles/visible.ts` + tests.
3. Réglage admin, page et composant, style de la barre.
4. Gates et vérification navigateur.

## Rollback / réversibilité

Remettre `visibleCount` à une valeur supérieure au nombre de styles masque la barre ; revert du commit sans impact sur les données.
