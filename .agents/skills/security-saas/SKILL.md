---
name: security-saas
description: Audit de sécurité officiel Africa SaaS Kit. Scanne les fichiers du SaaS, exécute les gates Zod/auth/RLS/rate-limit/packages et produit un score + rang sans exposer les secrets.
---

## Langue de réponse
Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

# /security-saas — Audit sécurité complet du SaaS

Quand cette skill est invoquée :

1. Ne jamais demander, afficher ni copier une clé API, un mot de passe, un bearer token ou le contenu complet de `.env.local` dans le chat.
2. Exécuter `npm run security-saas` depuis la racine du SaaS.
3. Lire `generated/security-saas-report.md` et `generated/security-saas-report.json`.
4. Présenter le **score**, le **rang** et chaque FAIL/À VÉRIFIER, en donnant d'abord les correctifs les plus critiques.
5. Le contrôle doit couvrir au minimum :
   - secrets et clés API hors du code source ;
   - `.env.local` protégé par `.gitignore` et non suivi par Git quand l'index est disponible ;
   - absence de secrets `NEXT_PUBLIC_*` ;
   - RLS + policies déclarées sur toutes les tables classifiées ;
   - validation RLS réelle sur Neon/Postgres lorsque le mode online est disponible ;
   - validation serveur de toutes les mutations ;
   - gate **Zod** sur Server Actions, routes API mutantes et formulaires client concernés ;
   - middleware/proxy et gardes d'authentification serveur ;
   - vérification email ;
   - rate limiting ;
   - vérification des webhooks et autres garde-fous du Security Baseline ;
   - planchers de versions des dépendances sensibles ;
   - `npm audit` quand `package-lock.json` existe.
6. Si `DATABASE_URL_DIRECT` ou `DATABASE_URL` est disponible localement et que les dépendances sont installées, exécuter aussi `npm run security-saas:online` afin de vérifier réellement RLS + policies dans la base. Ne jamais afficher l'URL.
7. Si `package-lock.json` ou les dépendances manquent, afficher **À VÉRIFIER** et ne jamais transformer cette absence en faux PASS.
8. Après correction demandée par l'utilisateur, relancer l'audit et comparer le nouveau score/rang au précédent.
9. La page d'accueil locale du kit lit le dernier rapport généré et doit afficher la commande `/security-saas`, le score/rang et le détail des contrôles.

Un rang élevé n'est pas une garantie absolue d'absence de vulnérabilité : il mesure la conformité aux garde-fous automatisables du kit.


## Règle de refactorisation
Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.
