# Accents vocaux par langue (français ivoirien, anglais ghanéen…)

- Statut : EN COURS (besoin du propriétaire du 2026-10-05)
- Workflow : **PLAN → SPEC → TEST → CODE → VERIFY**

## Objectif

Aujourd'hui le client choisit « Français » ou « Anglais » ; Musicful reçoit « sung in French ». Le propriétaire veut préciser l'**origine** de la langue chantée (français ivoirien, sénégalais ; anglais ghanéen, nigérian…) pour obtenir le bon accent, **sans rien montrer au client**. Tout ce qui part vers Musicful reste en **anglais**.

## Décisions (propriétaire, 2026-10-05)

1. **Sélection** : la variante est liée au **style musical** (ex. Zouglou → français ivoirien). Le client choisit style + langue, l'accent suit automatiquement.
2. **Contenu** : **accent seulement** (pas de phrase d'instrumentation par lien) ; les instruments restent portés par la consigne IA des styles.
3. Un style a **au plus une variante par langue** ; l'associer à une autre variante de la même langue la déplace.
4. Style sans variante, ou variante inactive : comportement actuel inchangé (« sung in French »).

## Données

- `language_accents` : id, `language_code` (→ `languages.code`, cascade), `name` (français, admin seulement), `ai_hint` (anglais, ≤ 200 car.), `active`, `sort_order`, dates.
- `music_style_accents` : `style_id` (→ `music_styles`, cascade), `accent_id` (→ `language_accents`, cascade), `language_code`, **PK (style_id, language_code)**.
- Migration idempotente `0067`, GRANT `musikpro_service`. Tables « exemptes » (catalogue admin, jamais lues par le client) dans `config/security-rls.json`.

## Envoi à Musicful

`buildVocalHint(language, voice, accentHint)` → `female lead vocals, sung in French with <accentHint>`. L'ambiance et la consigne vocale ne sont jamais tronquées ; 200 car. max garde le pire cas sous 1 000 caractères.

## Admin

Onglet **« Accents vocaux »** dans `/admin/languages` (`AdminTabs`, `AdminActionForm`, toasts) : créer, modifier, activer/désactiver, supprimer, cocher les styles associés. Aucune trace côté client (aucune table lue par le tableau client).

## i18n

Réglage technique admin en français, consigne envoyée en anglais : rien n'est traduit ni affiché au client.

## Tests prévus

- [ ] `buildVocalHint` avec/sans accent, langue inconnue, longueur.
- [ ] Schéma Zod (hint anglais ≤ 200, langue obligatoire, styles bornés).
- [ ] Résolution : style lié → hint ; inactif/absent → vide ; mauvaise langue → vide.
- [ ] Prompt complet ≤ 1 000 caractères avec accent.

## Critères d'acceptation

- [ ] Zouglou + Français avec variante ivoirienne → « Vocals: … sung in French with natural Ivorian French accent… » dans le style envoyé.
- [ ] Sans variante : prompt identique à aujourd'hui.
- [ ] Rien de nouveau visible côté client ; gates du kit PASS.

## Rollback

Supprimer les variantes (ou l'onglet) : retour au comportement actuel. Tables inutilisées sans effet.
