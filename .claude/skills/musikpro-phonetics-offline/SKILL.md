---
name: musikpro-phonetics-offline
description: Intégrer le moteur phonétique MusikPro sans IA (V4) avec 1 354 graphies : 737 noms africains V2, 316 prénoms francophones adoptés en Afrique V3, 301 variantes supplémentaires de noms/prénoms musulmans rencontrés en Afrique francophone ; champs phonétiques grisés readonly et sortie compatible Musicful.
---

## Langue de réponse

Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

## Règle de refactorisation

Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.

## Emplacement dans ce dépôt

Les sources vivent dans `lib/phonetics-offline/` (le dépôt n’a pas de dossier `src/`) ; les tests sont `tests/phonetics-offline.test.ts` (Vitest) et `bash scripts/run-phonetics-tests.sh` ; la documentation est dans `docs/phonetics-offline/`. Partout où ce skill écrit `src/lib/phonetics-offline`, lire `lib/phonetics-offline`. Politique Musicful : `use-local-rules` est remplacé par `keep-original` dans `app/api/songs/generate/route.ts` (recommandation V4 : ne pas injecter une estimation non validée).

# MusikPro — Skill phonétique locale V4 : noms africains + francophones + tradition musulmane

## Objectif

Remplacer **seulement les appels à l'IA destinés à phonétiser les noms des utilisateurs** dans les deux formulaires MusikPro, par un lexique local TypeScript synchronisé avec un moteur d'analogie/découpage. Éviter ainsi les crédits liés à ces appels de prononciation. L'IA qui génère les paroles et **Musicful** qui génère l'audio restent opérationnels et peuvent encore consommer leurs propres crédits.

## Lexique inclus

- **V2 conservée : 737 graphies africaines** (prénoms et noms de famille).
- **V3 conservée : 316 noms/prénoms francophones d'usage africain**, par exemple Richard, Guillaume, Evra, Patrick et Chantal ; pas de catalogue indiscriminé de patronymes français de France.
- **V4 ajoutée : 301 graphies distinctes supplémentaires** de noms et prénoms de tradition musulmane rencontrés en Afrique francophone, avec orthographes locales et variantes. Par exemple **Madou, Mouhamed, Mouhamadou, Ahmadou, Djibril, Abdoul, Oumou, Fatimatou, Ramatoulaye**.
- **Total : 1 354 graphies, 1 341 clés de recherche normalisées.** L'analyse ne dépend pas d'une API ni de Neon.
- **Mohammed, Mohamed et Mamadou étaient déjà présents** : les entrées existantes sont préservées pour éviter toute régression ; la V4 ajoute les graphies manquantes, dont **Madou**.

**Attention :** les découpages sont des **guides d'aide au chant**, pas une phonétique IPA certifiée. Ils peuvent varier selon la langue locale, le pays, la famille et la façon dont Musicful chante. `confidence: 'high'` signifie **correspondance exacte du dictionnaire**, pas vérification linguistique externe. **Ne déduire jamais la religion d'une personne à partir de son nom.**

## Règles UI immuables

1. Conserver **exactement l'interface actuelle** : le client modifie « Votre nom » et « Nom de la personne », tandis que **les deux champs « Prononciation suggérée » restent visuellement grisés et verrouillés**.
2. Utiliser `readOnly` + `aria-readonly="true"` pour les deux champs grisés ; **pas de `onChange` / bouton / édition manuelle du champ phonétique**, pas de champ additionnel. Préserver leurs `className`, dimensions, position, libellés et couleurs actuels.
3. Valeur générée **immédiatement et synchroniquement** par `getPronunciation(name, { locale: 'fr-CI' }).pronunciation` quand l'utilisateur saisit/colle/modifie son nom. **Aucun appel `fetch`, aucune API IA, aucune requête réseau** sur la saisie ou à la soumission pour la phonétisation.
4. Les variantes accentuées et les différences de casse sont reconnues par recherche normalisée ; préserver l'orthographe source.
5. En absence d'entrée, appliquer l'analogie puis les règles locales et marquer la sortie `needsReview: true` en interne. Ne pas permettre aux clients de modifier les deux champs grisés.
6. Corrections uniquement dans une interface propriétaire authentifiée/autorisée côté serveur, avec validation Zod et journal d'audit, si l'application possède déjà cette fonctionnalité ou si le propriétaire la demande.

## Installation et raccordement au dépôt réel

1. Lire et appliquer **`CLAUDE.md`** (source de vérité du dépôt). Sauvegarder/commiter avant tout changement et inspecter les fichiers existants.
2. Installer à partir du ZIP les fichiers `src/lib/phonetics-offline/{dictionary,adopted-french-dictionary,african-muslim-used-names-dictionary,engine}.ts`. `dictionary.ts` agrège les **trois corpus sans supprimer l'existant**.
3. Repérer les deux champs de phonétique grisés et les appels IA qui produisent actuellement leurs valeurs. **Retirer uniquement ces appels de phonétisation**, en conservant tous les autres appels IA et services.
4. Dans les composants React réels, calculer localement :

   ```tsx
   import { getPronunciation } from '@/lib/phonetics-offline/engine';

   const senderPhonetic = senderName.trim()
     ? getPronunciation(senderName, { locale: 'fr-CI' }).pronunciation : '';
   const recipientPhonetic = recipientName.trim()
     ? getPronunciation(recipientName, { locale: 'fr-CI' }).pronunciation : '';

   // Appliquer aux DEUX inputs gris EXISTANTS. Garder leurs className actuels.
   <input value={senderPhonetic} readOnly aria-readonly="true" />
   <input value={recipientPhonetic} readOnly aria-readonly="true" />
   ```

5. Ne jamais faire confiance à une valeur phonétique venant du navigateur : **recalculer côté serveur** à partir des noms sources, puis préparer une copie des paroles pour Musicful :

   ```ts
   const { originalLyrics, musicfulLyrics, results } = prepareMusicfulLyrics(
     lyricsFromGenerator,
     [senderName, recipientName],
     {
       locale: 'fr-CI',
       unknownNamePolicy: 'keep-original', // recommandation sûre : ne pas injecter une estimation dans Musicful
       approvedOverrides: trustedOwnerOverrides, // seulement si récupéré serveur, autorisé
     },
   );
   // Stocker les paroles originales ; n'envoyer à Musicful que la copie musicfulLyrics.
   ```

6. Le paramètre `'keep-original'` évite d'imposer une phonétique **non validée** pour les noms absents du dictionnaire ; le champ grisé peut néanmoins afficher son estimation locale. Si le propriétaire préfère une substitution automatique pour tous les noms, choisir `'use-local-rules'` après tests, sans nouvel appel IA.
7. Ne pas remplacer les composants réels par `NamePronunciationPreview.tsx` : ce fichier est **un exemple**. Ne modifier ni paiements ni génération IA des paroles, ni crédits Musicful, ni sortie **MP3**, ni PWA/Capacitor, ni interface desktop, ni comportement d'autres pages. **Aucune dépendance obligatoire à Neon pour `npm run dev`.** Pas de fichiers Codex, pas d'icône Sparkles.
8. Tester d'abord en staging, puis seulement en production après validation.

## Exemples de sorties attendues

| Nom saisi | Prononciation suggérée |
| --- | --- |
| Mohammed | Mo-ha-med |
| Mohamed | Mo-ha-med |
| Madou | Ma-dou |
| Mamadou | Ma-ma-dou |
| Mouhamadou | Mou-ha-ma-dou |
| Ahmadou | Ah-ma-dou |
| Djibril | Dji-bril |
| Oumou | Ou-mou |
| Fatimatou | Fa-ti-ma-tou |
| Aïssatou | Aï-ssa-tou |
| Khadija | Kha-di-ja |
| Guillaume Traoré | Gui-yom Tra-o-ré |
| Richard Abdoul Karim | Ri-char Ab-doul Ka-rim |
| Bokara (hors lexique) | Bo-ka-ra (estimation) |

Ne pas réécrire arbitrairement « Madou » en « Mamadou » : ce sont des graphies et des noms distincts. Préserver les mots originaux dans les données métier.

## Tests et critères d'acceptation

1. Exécuter `bash scripts/run-phonetics-tests.sh`. Le script compile le moteur strictement et exécute les tests ; vérifier le résultat « OK V4 ».
2. L'inventaire doit comporter exactement **1 354 graphies**, dont **301 ajouts V4** sans conflit de normalisation, et **1 341 clés distinctes**.
3. Vérifier : `Mohammed`, `Mohamed`, `Madou`, `Mamadou`, `Mouhamadou`, `Djibril`, `Fatimatou`, `Aïssatou`, `Richard`, `Guillaume`, `Evra`, les noms composés, les patronymes, le nom vide et un nom inconnu.
4. Les deux champs grisés doivent rester en **lecture seule** et leur prévisualisation ne doit provoquer **aucun appel réseau IA** (tester la saisie, le collage, le blur, la soumission et la génération).
5. Recalcul serveur obligatoire avant Musicful ; seules les occurrences des noms fournis sont substituées dans une **copie** des paroles, et pas les sous-chaînes d'autres mots.
6. Réexécuter les tests / typecheck / build Next.js propres au projet, les parcours Musicful/MP3, les applications PWA/Capacitor et les vérifications de non-régression avant déploiement.

## Livrables du ZIP

- `.claude/skills/musikpro-phonetics-offline/SKILL.md` — présent skill Claude Code.
- `src/lib/phonetics-offline/african-muslim-used-names-dictionary.ts` — **301 nouveaux noms**.
- `src/lib/phonetics-offline/{dictionary,adopted-french-dictionary,engine}.ts` — moteur et corpus V2/V3 conservés.
- `src/components/NamePronunciationPreview.tsx` — **exemple** de champ `readOnly`, ne pas remplacer le formulaire réel.
- `docs/musikpro-phonetics/INTEGRATION.md`, `scripts/run-phonetics-tests.sh`, `tests/test-phonetics.cjs` — documentation et tests.
- `INSTALLATION-PHONETIQUE-V4.md` — instructions de déploiement.

Ce skill n'a **pas** été installé dans le dépôt MusikPro ni déployé depuis cette conversation. Il doit être intégré par Claude Code dans le projet réel, puis vérifié dans l'interface et sur le réseau.
