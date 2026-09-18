# Cloudflare domaine/DNS — optionnel

Cloudflare peut être utilisé comme registrar/DNS pour le domaine du SaaS, mais il n’est jamais requis par Africa SaaS Kit.

Cette phase est volontairement tardive (Phase 17), après le staging et après la décision paiements.

## Sans Cloudflare
Utiliser le registrar/DNS de son choix, puis marquer la Phase 17 `skipped`.

## Avec Cloudflare
1. Ajouter/acheter le domaine dans Cloudflare.
2. Ajouter le domaine custom dans Vercel.
3. Copier dans Cloudflare DNS les enregistrements exacts affichés par Vercel.
4. Valider HTTPS et les redirections.
5. En cas de difficulté de vérification SSL/DNS, passer temporairement l’enregistrement en DNS only, puis re-tester.

## Important
Cloudflare domaine/DNS ≠ Cloudflare R2. R2 reste non intégré dans le kit tant qu’un adaptateur de stockage réel n’existe pas.
