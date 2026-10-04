# Entrées non fiables — validation et rendu sûr

Toute donnée provenant de l'utilisateur, d'une URL, d'un formulaire, d'un JSON API, d'un fichier uploadé ou d'un fournisseur externe est non fiable par défaut.

## Règles du kit

- Zod côté serveur est l'autorité pour les données structurées first-party.
- Les validations client améliorent l'UX mais ne remplacent jamais la validation serveur.
- Les requêtes SQL ne doivent jamais être construites par concaténation de données utilisateur.
- Les APIs `*RawUnsafe` sont interdites dans le runtime du starter.
- Les IDs/params dynamiques doivent être validés ou vérifiés par une allowlist/provider registry explicite.
- Les uploads sont limités en taille/type et validés avant l'envoi au storage.
- Le HTML utilisateur est interdit par défaut.
- `dangerouslySetInnerHTML` n'est autorisé que pour une exception documentée et sûre. Le starter n'autorise actuellement que le JSON-LD sérialisé avec échappement de `<`.

Commande : `npm run security:input-check`.
