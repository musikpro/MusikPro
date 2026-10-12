# MusikPro — Phonétique locale sans IA V4

Le nouveau lexique cible en particulier les prénoms et noms musulmans courants en Afrique francophone (dont **Mohammed, Madou, Mamadou, Mouhamadou, Ahmadou, Djibril, Oumou, Aïssatou, Fatimatou**). Il **ne remplace pas** les anciens corpus africains et francophones.

## Contenu et volumes

| Partie | Nombre de graphies |
| --- | ---: |
| V2 — corpus africain existant | 737 |
| V3 — noms français/francophones portés en Afrique | 316 |
| V4 — graphies musulmanes africaines supplémentaires, sans doublons normalisés | 301 |
| **Total** | **1 354** |

**1 341 clés normalisées distinctes**. Une clé correspond à une recherche insensible à la casse et aux accents ; certaines graphies accentuées partagent donc une clé. Le lexique est un guide de syllabification chantée et non une certification de prononciation ; l'identité religieuse ne doit jamais être inférée de la présence d'un nom dans ce corpus.

## Installation (Claude Code uniquement)

1. Avant extraction, sauvegarder/commiter le dépôt réel MusikPro.
2. Extraire le ZIP **à la racine du projet**. Le ZIP n'a pas de dossier englobant et contient des chemins comme `.claude/skills/...` et `src/lib/...`. Vérifier tout remplacement de fichier existant avant validation.
3. Demander à Claude Code :

   > Lis `.claude/skills/musikpro-phonetics-offline/SKILL.md`. Intègre la V4 en conservant intégralement les corpus V2 et V3, et en ajoutant les 301 nouvelles entrées musulmanes africaines. Remplace **uniquement** les appels IA de phonétisation de mes deux formulaires par `getPronunciation`. Conserve mes champs « Prononciation suggérée » grisés, `readOnly` et non modifiables. Ne change pas l'interface, les autres appels IA, le MP3 Musicful ni le mobile. Respecte `CLAUDE.md`, recalcule côté serveur à partir du nom original, puis exécute tous les tests et vérifications de non-régression.

4. Lancer `bash scripts/run-phonetics-tests.sh`. Les tests du moteur ont été exécutés dans l'environnement de préparation, **mais pas dans le véritable projet MusikPro**.
5. Tester l'absence d'appels réseau IA pour phonétiser pendant la saisie et la soumission ; contrôler en staging la génération réelle de musique et l'audio MP3.

## Exemples

| Saisie | Suggestion locale |
| --- | --- |
| Mohammed | Mo-ha-med |
| Madou | Ma-dou |
| Mamadou | Ma-ma-dou |
| Mouhamadou | Mou-ha-ma-dou |
| Ahmadou | Ah-ma-dou |
| Djibril | Dji-bril |
| Fatimatou | Fa-ti-ma-tou |
| Oumou | Ou-mou |
| Richard Abdoul Karim | Ri-char Ab-doul Ka-rim |

Les prénoms inconnus donnent une estimation locale visible mais non modifiable dans les deux champs grisés. Pour le remplacement dans les paroles envoyées à Musicful, privilégier `unknownNamePolicy: 'keep-original'` tant qu'une prononciation n'a pas été validée.

## Limites

- Les formes régionales/familiales peuvent varier ; certains groupes de lettres latines n'indiquent pas leur prononciation de façon fiable.
- Un nom enregistré dans le lexique n'est pas nécessairement porté par une personne musulmane : **aucune inférence religieuse**.
- Le dictionnaire local ne garantit pas comment Musicful chantera réellement les syllabes.
- Aucun appel LLM n'est utilisé par **le moteur de phonétisation**, mais la génération de paroles IA et de musique Musicful peut rester facturée.
