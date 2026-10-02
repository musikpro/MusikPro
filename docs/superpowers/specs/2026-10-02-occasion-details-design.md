# Détails par occasion — personnalisation dynamique de la chanson

Date : 2026-10-02 — Statut : design validé en conversation, spec à relire.

## 1. Objectif

Rendre la chanson plus personnalisée. L'étape 3 du parcours de création
(`components/banani/StepRecipient.tsx`, « À qui est destinée la chanson ? »)
devient **« Personnalise ta chanson »** et son contenu dépend de l'occasion
choisie à l'étape 1. Le propriétaire gère les champs depuis le dashboard admin.

Critères de succès :
- Un client qui choisit « Anniversaire » voit, en plus des blocs destinataire /
  « de la part de qui », des champs propres à l'anniversaire (jour et mois de
  naissance…).
- Pour « Spot publicitaire », aucun bloc destinataire ni « de la part de » :
  nom du produit et champs publicitaires à la place.
- Les réponses arrivent dans le prompt du parolier IA, avec une consigne IA par
  champ.
- L'admin crée, modifie, trie, active, supprime et duplique des champs par
  occasion sans toucher au code.
- Aucune régression : les occasions existantes sans champ configuré se
  comportent comme aujourd'hui.

## 2. Décisions validées

| Sujet | Décision |
|---|---|
| Types de champs | Texte court, texte long, liste de choix, nombre, date (pas de champs conditionnels). |
| Blocs actuels | Blocs intégrés conservés (prononciation IA incluse), activables par occasion. |
| Rattachement | Un champ appartient à une seule occasion ; bouton « Dupliquer vers… ». |
| Usage | Injection dans le prompt des paroles, consigne IA par champ, conservation dans `requestPayload`. Pas de persistance du brouillon, pas de colonne dédiée. |
| Stockage | Nouvelle table `occasion_fields` + 3 colonnes sur `occasions`. |
| Titre étape 3 | « Personnalise ta chanson » (sous-titre : « Quelques détails pour que ce soit vraiment la tienne »). |
| Titre étape 5 | « Paramètres additionnels » renommé « Langue et voix » (évite la confusion avec l'étape 3). |
| Menu admin | « Détails par occasion », groupe « Configuration », à côté de « Occasions ». |
| Assistance IA (admin) | Trois assistants sur le fournisseur IA déjà connecté (`getLyricsProvider`), déclenchés au clic, sans écriture avant validation : proposer des champs, compléter un champ, suggérer les blocs. |

Hors périmètre : refonte de la sélection « relation » en tuiles (reste un
`MusikSelect`, aucune modification), champs conditionnels, bibliothèque de champs partagés,
persistance du brouillon en `localStorage`, statistiques sur les réponses.

## 3. Modèle de données

### Table `occasion_fields` (`db/schema/index.ts`)

- `id` text PK (`randomUUID()` ; `default-…` pour le seed).
- `occasion_id` text not null, FK → `occasions(id)` `ON DELETE CASCADE`.
- `key` text not null, identifiant stable (`birth_day`), unique par occasion
  (`UNIQUE (occasion_id, key)`).
- `label` text not null (français, valeur canonique), `help_text` text default ''.
- `icon` text default '' (emoji affiché devant le libellé, ex. 📅).
- `placeholder` text default '' (texte d'exemple, ex. « Ex: 15 »).
- `type` text not null : `short_text` | `long_text` | `select` | `number` | `date`.
- `options` jsonb : liste d'objets `{ label, emoji }` (type `select`), `label`
  en français = valeur canonique envoyée à la génération.
- `config` jsonb : `maxLength` (textes), `min` / `max` (nombre),
  `display` (`dropdown` | `tiles`, type `select`, `tiles` par défaut si ≤ 12
  options).
- `required` boolean default false.
- `ai_hint` text default '' (consigne anglaise, invisible du client, max 200).
- `sort_order` integer default 100, `active` boolean default true.
- `translations` jsonb : `{ en: { label, helpText, placeholder, options: [label…] }, es: …, pt: … }`
  (l'emoji des options n'est pas traduit).
- `created_at`, `updated_at`.
- Index `occasion_fields_occasion_order_idx (occasion_id, active, sort_order)`.
- Maximum 8 champs actifs par occasion (contrôle serveur).

### Colonnes ajoutées sur `occasions`

- `show_recipient` boolean not null default true.
- `show_sender` boolean not null default true.
- `title_field_id` text null (champ dont la valeur sert de titre quand il n'y a
  pas de destinataire).

### Migration `0062_occasion_fields.sql`

Écrite à la main, sur le modèle de `0057_moods_catalog.sql` :
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `--> statement-breakpoint`, entrée
dans `meta/_journal.json` (`when` = précédent + 1000), puis
`GRANT SELECT … TO musikpro_runtime` et
`GRANT SELECT, INSERT, UPDATE, DELETE … TO musikpro_service`.

Seed de champs par défaut : `INSERT … SELECT … FROM occasions WHERE slug = …
ON CONFLICT (occasion_id, key) DO NOTHING`. Les occasions `sport`,
`priere-culte` et `spot-publicitaire` n'existent qu'en base : la migration les
cible par slug et ne fait rien si elles sont absentes. Pour
`spot-publicitaire` : `UPDATE occasions SET show_recipient = false,
show_sender = false` et `title_field_id` = champ « Nom du produit ».

Les migrations sont à tester sur la branche Neon staging avant production
(voir mémoire « Migrations avant déploiement »).

### Champs par défaut (français, éditables ensuite depuis l'admin)

| Occasion | Champs |
|---|---|
| Anniversaire | Jour de naissance (nombre 1–31, icône 📅, exemple « Ex: 15 »), Mois de naissance (liste en tuiles avec emoji : ❄️ Janvier, 💝 Février, 🌸 Mars, 🌷 Avril, 🌺 Mai, ☀️ Juin, 🌴 Juillet, 🏖️ Août, 🍂 Sept, 🎃 Octobre, 🍁 Nov, 🎄 Déc ; icône 🗓️), Âge fêté (nombre, facultatif), Passion ou trait de personnalité (texte court) |
| Amour | Surnom affectueux, Comment vous vous êtes rencontrés (texte long), Ce qui vous unit (texte long) |
| Graduation | Diplôme obtenu, Établissement, Prochain projet |
| Fête | Type de fête (liste : mariage, baptême, fiançailles, réunion de famille, soirée, autre), Nom ou lieu de l'événement |
| Séparation | Ce que tu veux exprimer (liste : tourner la page, tristesse, pardon, force), Un souvenir à évoquer (texte long) |
| Gratitude | Ce pour quoi tu remercies (texte long), Depuis quand cette personne t'accompagne |
| Sérénité | Ce qui t'apaise, Moment de la journée (liste) |
| Motivation | Objectif à atteindre, Obstacle à dépasser |
| Sport | Discipline, Équipe ou compétition, Objectif |
| Prière / culte | Thème ou verset, Intention de prière (texte long) |
| Spot publicitaire | Nom du produit ou de la marque (obligatoire, titre), Public ciblé, Durée (liste : 15 s, 30 s, 60 s), Points forts (texte long), Appel à l'action |

Les traductions ne sont jamais écrites à la main : elles sont remplies par le
bouton « Actualiser les traductions ».

## 4. Admin — menu « Détails par occasion »

- Entrée ajoutée dans le tableau `navigation` de `components/admin/AdminShell.tsx`
  (groupe « Configuration ») et dans `app/admin/menu/page.tsx`.
- `app/admin/occasion-fields/page.tsx` : liste des occasions avec le nombre de
  champs actifs.
- `app/admin/occasion-fields/[occasionId]/page.tsx` : `AdminTabs` /
  `AdminTabPanel` (`components/admin/AdminTabs.tsx`) avec deux onglets :
  - **Blocs intégrés** : interrupteurs `show_recipient`, `show_sender`, liste
    déroulante `title_field_id`.
  - **Champs** : liste triable par glisser-déposer (sur le modèle de
    `AdminOccasionSortableGrid`), créer / modifier / activer / supprimer /
    « Dupliquer vers… ».
- Actions serveur dans `app/admin/occasion-fields/actions.ts`, toutes avec la
  signature `(previous: AdminActionState, formData) => Promise<AdminActionState>`,
  corps dans un `try/catch`, `actionErrorMessage` pour les erreurs Zod,
  `writeAuditLog`, et revalidation de `/admin/occasion-fields`,
  `/dashboard/create/recipient`, `/demo/create/recipient`. Formulaires via
  `AdminActionForm` (plusieurs boutons par ligne : formulaires distincts reliés
  par `form={id}`, comme `app/admin/payment-providers/chariow/page.tsx`).
  Redirection éventuelle via `withAdminNotice`.
- Validation Zod : `label` 2–80, `helpText` max 160, `icon` (emoji de
  `OCCASION_EMOJI_OPTIONS`, via le sélecteur `AdminOccasionEmojiPicker`),
  `placeholder` max 60, `type` enum, `options` 2–12 entrées
  `{ label 1–60, emoji }` (type liste uniquement), `config` cohérente
  avec le type, `aiHint` max 200, `sortOrder` 0–999, plafond de 8 champs actifs.
- La table est ajoutée à `runCatalogTranslationsRefresh()`
  (`app/admin/languages/actions.ts`) via `translateCatalogTable()`, et au type
  `Counts` / texte de `components/admin/RefreshCatalogTranslationsButton.tsx`.

## 4 bis. Assistant IA dans « Détails par occasion »

Réutilise le principe du bouton « Suggérer la consigne » (`suggestOccasionAiHint`) : fournisseur IA
connecté (`lib/ai/provider.ts` → `getLyricsProvider`, `runProviderTextTask`), modération
(`moderateText`), message clair si le fournisseur n'est pas configuré. Aucune nouvelle clé.

- **Proposer des champs** (onglet « Champs ») : l'IA lit le nom et la description de l'occasion et les
  champs déjà présents, et propose jusqu'à 6 champs (libellé, type, icône, texte d'exemple, aide,
  options avec emoji, obligatoire, consigne IA en anglais). Aperçu avec cases à cocher ; **rien n'est
  écrit** avant « Ajouter la sélection ». Les propositions cochées sont **revalidées côté serveur**
  avec `occasionFieldFormSchema` (jamais de confiance dans le navigateur), plafond de 8 champs actifs.
- **Compléter un champ** (formulaire de champ) : à partir d'un libellé, l'IA remplit type, icône,
  exemple, aide, options, consigne ; le formulaire est prérempli, l'admin relit et enregistre.
- **Suggérer les blocs** (onglet « Blocs intégrés ») : l'IA indique si le destinataire et « de la
  part de qui » ont du sens et quel champ sert de titre ; les listes sont préremplies, l'admin enregistre.
- Garde-fous : sortie JSON analysée et assainie (propositions invalides écartées, doublons de libellé
  écartés, types limités à ceux de la spec), interdiction demandée à l'IA de proposer des données
  sensibles (santé, pièces d'identité, paiement, mots de passe), modération du texte généré, limite de
  30 appels par heure et par admin, journal d'audit à l'ajout.
- Hors périmètre : raccourci « Créer l'occasion et proposer des champs », assistance sur les autres
  catalogues (styles, ambiances, relations).

## 5. Parcours client

- `StepRecipient.tsx` : titre et sous-titre traduits via `translate` (`t`) ;
  `npm run i18n:sync` puis `npm run i18n:check`. L'étape 5
  (`StepAdditionalParams.tsx`) est renommée « Langue et voix ».
- Blocs intégrés rendus selon `show_recipient` / `show_sender` ; logique de
  prononciation IA inchangée. `continueToStyle()` ne valide
  `demoRecipientSchema` / `demoSenderSchema` que pour les blocs affichés.
- Champs dynamiques rendus selon leur type, sous les blocs intégrés : icône emoji
  + libellé (style des titres de la maquette), `placeholder` dans le champ ;
  les listes `tiles` s'affichent en grille de tuiles (3 colonnes sur mobile, emoji
  au-dessus du libellé, tuile sélectionnée mise en évidence comme les tuiles
  d'occasion), les listes `dropdown` avec `MusikSelect`. Libellés et options via
  `localizeField()`. La valeur française reste la valeur stockée et
  envoyée.
- Catalogue chargé dans `app/dashboard/layout.tsx` (nouveau
  `getActiveOccasionFields`, groupé par `occasion_id`) et passé au
  `DemoProvider`, avec un repli vide pour le parcours démo.
- État : `details: Record<fieldId, string>` dans le `DemoProvider`, **vidé quand
  `choices.occasion` change**. Non persisté.
- Schéma Zod construit par une fonction pure partagée
  (`lib/occasion-fields/validation.ts`) depuis les définitions : utilisée côté
  client et côté serveur.

## 6. Génération

- `lib/validation/ai.ts` : `lyricsContextSchema` gagne
  `occasionDetails: z.array({ fieldId, value }).max(8).optional().default([])`
  (rétrocompatible). `songGenerateRequestSchema` gagne le même champ optionnel.
- `/api/ai/generate` : le serveur retrouve l'occasion par son nom français
  (`lower(name)`), recharge ses champs actifs et valide chaque réponse : champ
  inconnu refusé, obligatoire rempli, valeur de liste ∈ options, nombre dans
  l'intervalle, date valide, longueurs respectées, textes passés à
  `moderateText`.
- `lib/ai/lyrics.ts` (`promptFor`) : ajoute un bloc
  `Informations personnalisées:` avec `Libellé : valeur` et la consigne IA
  quand elle existe. Valable pour `lyrics.generate`, `extend` et `rewrite`.
- `/api/songs/generate` : reçoit `occasionDetails` pour le conserver dans
  `requestPayload` (`lib/ai/music-jobs.ts`) et pour le titre. Les réponses
  n'entrent pas dans le prompt musical (`resolveStylePrompt`) : l'IA musicale
  les reçoit indirectement, via les paroles.
- `lib/ai/song-title.ts` : sans destinataire, utilise la valeur du champ
  `title_field_id` ; à défaut, « Occasion — Style — mois année ».
- Limite de 48 Ko de `rejectOversizedRequest` à vérifier avec 8 champs.

## 7. Sécurité, compatibilité et vérifications

- Toute entrée validée côté serveur avec Zod ; un client ne peut ni ajouter un
  champ inexistant ni dépasser les limites.
- `ai_hint` jamais exposé au client.
- Changements additifs : colonnes avec valeurs par défaut, paramètres
  optionnels, aucun changement des routes, contrats API existants ou clés
  canoniques (nom français de l'occasion).
- Tests : schémas Zod (chaque type de champ, cas limites, champ inconnu),
  construction du bloc de prompt, migration idempotente (double exécution).
- Contrôles du kit : `npm run kit:integrity`, `npm run kit:audit`,
  `/security-saas`, `npm run i18n:check`, typecheck, lint, tests.
- Test navigateur : parcours Anniversaire (champs dynamiques), parcours Spot
  publicitaire (sans blocs destinataire), changement d'occasion (réponses
  effacées).

## 8. Points ouverts pour le plan

- Avant d'écrire la migration, lire (lecture seule) les occasions réelles en
  base pour connaître les slugs exacts de Sport, Prière/culte et Spot
  publicitaire. La migration crée celles qui manquent avec les slugs standard
  `sport`, `priere-culte`, `spot-publicitaire` (`ON CONFLICT (slug) DO NOTHING`,
  sans doublon si elles existent déjà), puis seed leurs champs.
- Vérifier que le texte « Raconte ton histoire » (étape 2) et le champ
  « Souvenir spécial » (étape 5) ne font pas doublon avec les nouveaux champs ;
  ajuster les champs par défaut si besoin.
