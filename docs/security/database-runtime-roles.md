# Connexions et RLS de MusikPro

`DATABASE_URL` utilise `musikpro_runtime` : accès CRUD aux tables Better Auth,
lecture des catalogues utilisés par le serveur et lecture des données privées
sous RLS. Ce rôle ne peut ni modifier les soldes/paiements ni créer des tables.
Les requêtes privées du dashboard passent par `userQuery(session.user.id, query)`.
L'identité provient exclusivement d'une session vérifiée côté serveur. Le contexte
est local à la transaction Neon HTTP batch et ne persiste pas dans le pool.
Le contexte organisation reste vide tant qu'une appartenance autorisée n'est pas
vérifiée par le serveur.

`DATABASE_SERVICE_URL` utilise `musikpro_service` : opérations DML métier des actions
admin autorisées, checkout authentifié, webhooks vérifiés, cron protégé et audit.
Il peut lire les utilisateurs pour les jointures admin, mais ne peut pas lire les tables de sessions, credentials ou 2FA. Ses policies RLS lui permettent les traitements globaux. Il n'est pas propriétaire
des tables, n'a pas BYPASSRLS et ne peut pas modifier le schéma. Cette connexion est
une capacité privilégiée serveur : ne jamais l'utiliser dans le navigateur ni dans
un endpoint non protégé. `getServiceDb()` refuse de fonctionner sans ce secret.
Les contrôles serveur restent indispensables, y compris pour les tables exemptées
de RLS de Better Auth et les catalogues internes.

`DATABASE_URL_DIRECT` conserve la connexion propriétaire initiale, directe,
réservée aux migrations. Ne jamais l'utiliser pour le rendu ou les requêtes métier.
Ne pas copier cette connexion dans le bundle mobile.

## Développement

Après la migration initiale du starter, avec la connexion propriétaire encore
configurée dans `DATABASE_URL` :

```bash
npm run db:runtime:migrate
npm run db:runtime:provision
npm run db:runtime:test
npm run security:db-check
```

Le provisioning génère des mots de passe aléatoires, vérifie les connexions, puis
met à jour `.env.local` avec des permissions `600`. Il conserve l'ancienne connexion
sous `DATABASE_URL_DIRECT`. Ne pas réexécuter le provisioning une fois le rôle runtime
configuré : une rotation doit être explicite et coordonnée avec les déploiements.
Redémarrer le serveur Next.js pour charger les nouvelles connexions.

Le test crée deux utilisateurs temporaires, vérifie l'isolation des crédits A/B,
le refus sans contexte, la non-persistance du contexte après transaction et
l'interdiction de mutation/DDL pour le runtime. Les fixtures sont supprimées ensuite.
`security:db-check` vérifie séparément les quatre tables RLS et leurs policies.

## Preview et production

Provisionner les rôles séparément sur chaque base/branche ; ne pas copier les
secrets de production en Preview. La migration SQL est dans `db/migrations/`,
les mots de passe uniquement dans les variables locales/Vercel. Aucun mot de passe
ne doit être ajouté à une migration ou un rapport. Le rôle service obtient des droits
sur les tables existantes ; toute nouvelle table nécessite une revue explicite de
ses grants et de son classement RLS.

Le CRUD Clients Prisma reste non branché tant que Banani n'a pas été importé. Avant
son activation, ajouter ses grants explicites pour le runtime et valider sa policy
`app.current_user_id` ; sa migration optionnelle n'est pas appliquée ici.

## Limites de sécurité

RLS complète l'autorisation serveur ; le détenteur d'un identifiant SQL runtime peut
définir les paramètres `app.*`. Les identifiants ne doivent donc jamais être exposés
à un client non fiable. Les opérations service autorisent des accès globaux par
conception et doivent conserver leurs gardes serveur. Un PASS RLS ne signifie pas
que les audits dépendances, l'authentification ou le staging sont validés.
