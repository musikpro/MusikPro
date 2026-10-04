# Agent Safety Gate

## Principe

Une IA de développement peut lire des fichiers et exécuter des commandes, mais l'accès technique n'est pas une autorisation implicite.

Pour toute opération destructive ou difficilement réversible :

1. inspecter l'état actuel ;
2. proposer la modification et son impact ;
3. faire un dry-run ou une sauvegarde lorsque possible ;
4. demander l'accord explicite de l'utilisateur ;
5. exécuter uniquement l'action approuvée ;
6. vérifier le résultat et les régressions.

## Toujours bloqué sans accord explicite

- suppression massive de fichiers ou de migrations ;
- `git reset --hard`, `git clean -f*`, `git push --force` ;
- `DROP DATABASE`, `DROP TABLE`, `TRUNCATE TABLE` ;
- reset destructif d'une base ou des migrations ;
- suppression de projets ou ressources Vercel/Neon ;
- modification DNS critique ;
- rotation/suppression de secrets ;
- passage sandbox → live ;
- déclenchement d'un déploiement production.

## Variables d'environnement

L'agent ne modifie pas `.env.local` manuellement pour « faire marcher » un build. Les scripts de setup dédiés peuvent écrire les variables attendues lorsqu'ils sont explicitement lancés par l'utilisateur. Les valeurs secrètes ne sont jamais affichées dans le chat, les logs ou le frontend.

## Interdictions de contournement

Ne jamais :

- désactiver un test, Zod, RBAC, RLS, CSP, rate limiting ou vérification de signature pour obtenir un PASS ;
- supprimer une migration existante pour résoudre un problème ;
- remplacer une erreur par un faux état vert ;
- déclarer un test réussi s'il n'a pas réellement été exécuté.

Commande : `npm run agent:safety-check`.
