# Zod Validation Gate

Zod est le contrat de validation obligatoire pour les entrées structurées de première partie.

## Règle fondamentale
- **Client** : valider avec `safeParse` pour fournir un retour immédiat et éviter les requêtes manifestement invalides.
- **Serveur** : **revalider systématiquement**. Le navigateur est non fiable et la validation client ne constitue jamais une barrière de sécurité.
- Les Server Actions doivent utiliser Zod avant toute écriture, appel privilégié ou mutation.
- Les routes API POST/PUT/PATCH/DELETE doivent utiliser Zod, sauf exemption documentée dans `config/zod-validation.json`.
- Les schémas partagés doivent vivre sous `lib/validation/` lorsqu'un même contrat est utilisé côté client et serveur.
- Préférer `safeParse` aux erreurs non maîtrisées aux frontières HTTP; `.parse` reste acceptable dans une Server Action lorsque le gestionnaire d'erreur est intentionnel.
- Poser des limites explicites (`min`, `max`, `enum`, `regex`, `url`, coercions maîtrisées) et éviter `z.any()` pour les données non fiables.
- Après validation, n'utiliser que `parsed.data`, jamais l'objet brut d'origine.

## Exceptions
Les payloads bruts dont les octets doivent rester identiques pour vérifier une signature (webhooks) peuvent être exemptés au niveau route. Leur adaptateur doit ensuite vérifier/signaturer et normaliser les données avant usage métier. Les frameworks d'authentification qui possèdent leur propre contrat peuvent également être exemptés explicitement.

## Commandes
- `npm run validation:zod-check`
- `npm run verify:code`
- `npm run verify:production`
- `npm run ci:check`

Une nouvelle route ou Server Action non conforme fait échouer la CI avant livraison.
