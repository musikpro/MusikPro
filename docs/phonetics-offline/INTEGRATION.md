# Intégration — prononciations locales, Afrique francophone

## Où brancher

- Rechercher les deux champs « Prononciation suggérée » existants et les appels IA qui produisent actuellement leur valeur. Ils doivent garder **exactement la même présentation**, y compris la couleur grisée et le positionnement à côté du nom.
- Importer `getPronunciation` dans le composant React courant, recalculer **synchroniquement** les propositions à partir de `senderName` et `recipientName` à chaque rendu/édition. Pas de `fetch`, debounce réseau ou effet asynchrone sur la saisie.
- Utiliser `readOnly` sur les champs de suggestion, **jamais** `onChange` ni un bouton permettant la modification par le client. L'utilisateur remplit seulement les noms originaux.
- Mettre à jour la route ou server action de génération : recalculer côté serveur les suggestions à partir des seuls noms sources, en ignorant toute valeur phonétique envoyée par le navigateur. Faire le remplacement dans une **copie des paroles**, pas dans le texte source.
- Ne pas modifier les autres appels IA ni les requêtes Musicful, sinon pour renseigner le champ paroles avec la copie préparée. Conserver la sortie audio MP3.

## Corpus ciblé

Cette V3 n'inclut **pas** les 192 patronymes français génériques de l'ancien brouillon. Elle ajoute 316 entrées ciblées sur les prénoms utilisés dans les contextes francophones africains, et Evra/Evrard, en conservant les 737 entrées africaines V2.

Exemples à vérifier manuellement :

- `Richard → Ri-char`
- `Guillaume → Gui-yom`
- `Evra → Èv-ra`
- `François → Fran-soua`
- `Patrick → Pa-trik`
- `Jean-Pierre Koné → Jean-Pierre Ko-né`
- `Guillaume Traoré → Gui-yom Tra-o-ré`

Les graphies françaises ne permettent pas de déduire la nationalité et certaines prononciations varient selon la famille. L'estimation de l'algorithme pour les noms hors dictionnaire n'est pas aussi fiable qu'une entrée validée.

## Correction propriétaire facultative

Si le propriétaire demande un panneau d'administration, utiliser la table Prisma existante ou une table nouvelle après inspection du schéma. Limiter création, mise à jour, approbation et suppression par une **vérification serveur du rôle propriétaire**, validation Zod et piste d'audit. Ne pas autoriser un client à injecter les entrées approuvées, ni à modifier les deux champs grisés.

Le moteur accepte `approvedOverrides` ; dans un contexte client, n'injecter que des données déjà autorisées et publiques. Sur le serveur, récupérer de la source de confiance, jamais du formulaire client. L'application doit pouvoir démarrer sans Neon grâce au dictionnaire local.

## Checklist avant livraison

1. Tester `bash scripts/run-phonetics-tests.sh` (requires Node + `tsc`).
2. Tester `Richard`, `Guillaume`, `Evra`, un prénom composé, un nom africain, un nom inconnu et un champ vide dans les **deux** formulaires.
3. Confirmer qu'il est impossible de saisir dans les deux champs « Prononciation suggérée » ; aucune modification UX de l'interface originale.
4. Inspecter les appels réseau lors de l'entrée de noms, blur, navigation entre sections et soumission : **aucun appel IA phonétique**.
5. Vérifier que seules les occurrences des noms fournis sont substituées dans `musicfulLyrics`, et pas les mots qui contiennent ces noms.
6. Tester l'intégrité et le build Next.js du dépôt réel, plus l'app mobile PWA/Capacitor et staging.
7. Vérifier Musicful et la possibilité de télécharger le MP3, avec les crédits musicaux inchangés.

## Références

- HTML `readOnly` : https://developer.mozilla.org/fr/docs/Web/HTML/Attributes/readonly
- React : https://react.dev/reference/react/useMemo
- Next.js : https://nextjs.org/docs/app
