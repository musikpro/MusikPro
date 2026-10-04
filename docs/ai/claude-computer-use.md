# Computer Use / Browser dans Claude Code

La vérification visuelle du Africa SaaS Kit passe uniquement par Claude Code : navigateur/Computer Use disponible dans Claude Code ou serveur MCP navigateur explicitement autorisé.

## Règles

1. Exécuter `npm run computer-use:claude:check`.
2. Effectuer un vrai test navigateur sur une surface utile du projet.
3. Après succès réel seulement, enregistrer la preuve avec :
   `npm run computer-use:claude:mark -- --status=verified --evidence="description du test réel"`.
4. Le voyant reste orange tant qu’aucune preuve réelle n’a été enregistrée.
5. Une observation navigateur ne remplace jamais lint, typecheck, tests, build, audit sécurité, contrôle de signature webhook ou staging.
6. Les identifiants, MFA, achats, DNS critiques et passage sandbox → live restent sous contrôle humain.
