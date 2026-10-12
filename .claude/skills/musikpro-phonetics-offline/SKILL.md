---
name: musikpro-phonetics-offline
description: Intégrer dans MusikPro un moteur phonétique 100 % local, conservant 737 graphies africaines et ajoutant 316 prénoms et noms francophones adoptés en Afrique (Richard, Guillaume, Evra…), avec champs grisés en lecture seule et préparation des paroles Musicful.
---

## Langue de réponse

Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

## Règle de refactorisation

Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.

## Emplacement dans ce dépôt

Les sources vivent dans `lib/phonetics-offline/` (le dépôt n’a pas de dossier `src/`) ; les tests sont `tests/phonetics-offline.test.ts` (Vitest) et `bash scripts/run-phonetics-tests.sh` ; la documentation est dans `docs/phonetics-offline/`. Partout où ce skill écrit `src/lib/phonetics-offline`, lire `lib/phonetics-offline`.

# MusikPro — Skill de phonétique locale V3 (ciblage Afrique francophone)

## But

Remplacer **uniquement** les appels IA servant à obtenir la prononciation des noms saisis dans les sections du formulaire « De la part de qui » et « La personne concernée », par un dictionnaire TypeScript local et un moteur déterministe d'analogie/règles. **Ne pas supprimer les appels IA** qui rédigent éventuellement les paroles, ni les appels Musicful qui génèrent la chanson. Aucun token, clé, API distante ou base Neon n'est nécessaire à la phonétisation elle-même.

## Portée du dictionnaire — demande utilisateur exacte

- **Conserver intégralement les 737 graphies africaines/francophones de la V2.** Ce projet V3 en contient bien 737.
- Ajouter **316 graphies supplémentaires** de prénoms français/francophones utilisés par des personnes en Afrique francophone, plus les noms explicitement ciblés **Evra** et **Evrard**. Exemples : **Richard, Guillaume, Patrick, Jean, Jean-Pierre, François, Didier, Serge, Fabrice, Chantal, Clarisse, Christelle, Bernadette, Rosine**.
- **Ne pas ajouter** un gros catalogue de noms de famille typiques de France sans rapport avec le besoin (« Dupont », « De Gaulle », « Dubois », etc.). La V3 est une sélection d'usage francophone africain ; la fréquence réelle varie selon le pays et ne doit pas être affirmée sans données.
- Résultat : **1 053 graphies, 1 040 clés normalisées distinctes** ; variantes accentuées disponibles automatiquement à la recherche.
- Les prononciations sont des **guides de lecture adaptés au chant en français** : « Richard » → « Ri-char », « Guillaume » → « Gui-yom », « Evra » → « Èv-ra », « François » → « Fran-soua ». Pas de garantie acoustique Musicful, ni de certitude sans connaître la préférence de la famille.

## Règles essentielles de l'interface

Les captures d'écran fournies montrent deux champs **« Prononciation suggérée » grisés** à droite des champs nominaux. **Conserver strictement cette UX** :

1. « Votre nom » et « Nom de la personne » restent les **seuls champs éditables** concernant le nom.
2. Les deux « Prononciation suggérée » restent **grisés, toujours automatiques, jamais éditables par un client** ; employer `readOnly`, `aria-readonly="true"`, `value={getPronunciation(name).pronunciation}`, et **aucun `onChange` sur ces champs**. Préserver les styles/classes, tailles, alignements et labels existants ; **ne pas reconstruire le formulaire**.
3. Afficher la proposition immédiatement pendant que la personne tape son nom, par appel synchrone local dans React : **aucun `fetch`, aucune route API, aucune requête LLM, aucune facturation phonétique** lors d'un `onChange`, `onBlur` ou d'une soumission.
4. Pour un nom absent du dictionnaire, l'algorithme applique analogie puis règles. Son résultat est une **estimation** ; ne pas interrompre le formulaire, ne pas inventer une prononciation « certifiée » et ne pas demander une confirmation de l'utilisateur, puisque le champ est verrouillé.
5. Le client ne peut jamais modifier la suggestion. **Seul le propriétaire** corrige les graphies via un éventuel tableau de bord avec accès serveur, validation Zod et audit.
6. Si l'interface utilisait `disabled`, passer à `readOnly` **tout en conservant exactement l'apparence grisée**, lorsque nécessaire pour permettre l'affichage/lecture et la compatibilité des formulaires.
7. Les valeurs des champs readonly du navigateur sont **non fiables** : reconstituer les prononciations **côté serveur** à partir des noms sources avant toute génération Musicful. Ne jamais consommer un `phoneticName` envoyé par le navigateur comme source de vérité.

## Mode d'emploi dans le vrai dépôt

1. Lire **`CLAUDE.md`**, puis repérer les sections « De la part de qui », « La personne concernée », les états des noms, les champs gris et tous les appels à l'IA servant *uniquement* à phonétiser. S'aligner sur l'organisation réelle du dépôt Next.js.
2. Ajouter/importer :
   - `src/lib/phonetics-offline/dictionary.ts` — 737 entrées précédentes + agrégation des ajouts ciblés ;
   - `src/lib/phonetics-offline/adopted-french-dictionary.ts` — 316 ajouts sélectionnés ;
   - `src/lib/phonetics-offline/engine.ts` — `getPronunciation` / `prepareMusicfulLyrics`.
3. Pour les **deux champs existants** et pas ailleurs, remplacer la valeur calculée par l'appel IA par une valeur locale :

   ```tsx
   import { getPronunciation } from '@/lib/phonetics-offline/engine';
   const senderPhonetic = senderName.trim() ? getPronunciation(senderName, { locale: 'fr-CI' }).pronunciation : '';
   const recipientPhonetic = recipientName.trim() ? getPronunciation(recipientName, { locale: 'fr-CI' }).pronunciation : '';

   // Dans les deux <input> gris EXISTANTS, en gardant leurs className originaux :
   <input value={senderPhonetic} readOnly aria-readonly="true" /* ... */ />
   <input value={recipientPhonetic} readOnly aria-readonly="true" /* ... */ />
   ```

4. Au moment de transmettre les **paroles** à Musicful, recalculer **sur le serveur** avec les *noms* (pas les phonétiques soumises) :

   ```ts
   const { originalLyrics, musicfulLyrics, results } = prepareMusicfulLyrics(
     originalLyricsFromGenerator,
     [senderName, recipientName],
     { locale: 'fr-CI', unknownNamePolicy: 'use-local-rules', approvedOverrides: trustedOwnerEntries },
   );
   // originalLyrics : stocker/afficher comme source ; musicfulLyrics : envoyer au champ paroles.
   ```

5. Les corrections propriétaires approuvées doivent être chargées **par un code serveur de confiance**, protégé par autorisation ; jamais par JSON ou FormData libre. Si une base de données n'est pas disponible, fonctionner simplement avec le dictionnaire embarqué. Ne **pas** introduire une dépendance à Neon pour lancer `npm run dev`.
6. Ne modifier aucune politique de coût Musicalful, le format **MP3**, les autres fournisseurs, les paiements, les menus mobiles PWA/Capacitor, le design desktop ou les fonctionnalités de génération des paroles. Ne pas ajouter Codex ni de configuration d'agent autre que Claude Code. Éviter l'icône Sparkles.
7. Exécuter `bash scripts/run-phonetics-tests.sh`, puis tests/lint/typecheck/build réels du dépôt et validation staging. Tester manuellement la saisie dans les deux champs et l'absence de **requêtes réseau phonétiques** (la simple exécution des tests unitaires ne prouve pas l'absence d'ancien appel IA dans l'application tant qu'elle n'est pas intégrée).

## Sélection et limites

- Rechercher les graphies sans casse/accents et composer « Richard Kouassi », « Guillaume Traoré », « Evra Koffi », les prénoms composés « Jean-Pierre », « Marie-Claire », et les apostrophes africaines.
- Les règles apprises par analogie sur le lexique existant sont prudentes. Une estimation est marquée `confidence: 'low'` et `needsReview: true` en interne ; seules les entrées du dictionnaire et les corrections validées sont `high`, ce qui **ne constitue pas une certification phonétique**.
- Une graphie et sa prononciation peuvent avoir plusieurs variantes familiales ; la valeur choisie ne doit pas servir à inférer la nationalité, la religion ou l'origine ethnique.
- Voir `docs/INTEGRATION.md` et `README.md`. L'archive n'effectue **aucune modification** du site déployé : Claude Code doit intégrer les sources dans le véritable dépôt MusikPro.

## Critères d'acceptation

- Les **2 champs grisés** restent non éditables pour tous les visiteurs et sont remplis localement sans coût IA.
- La V2 africaine est conservée **sans suppression** ; seules les **316 entrées françaises/francophones ciblées Afrique** sont ajoutées (pas les 192 patronymes génériques de l'ancien brouillon V3).
- Les noms **Richard, Guillaume, Evra** sont prioritaires et reconnus dans les deux formulaires et dans les paroles.
- Les prénoms composés et combinaisons avec patronymes africains restent corrects.
- Le serveur ne fait confiance qu'au nom original et recalcule la prononciation en local avant Musicful.
- La génération de musique continue de produire des **MP3**, toutes les autres fonctions restent intactes ; tests de non-régression passés.
