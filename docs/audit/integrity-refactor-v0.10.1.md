# Audit intégrité — V0.10.1

Cette refactorisation conserve les fonctionnalités existantes et ajoute uniquement un point d’entrée d’installation guidé.

## Contrôles couverts

- fichiers critiques et skills officiels ;
- cohérence des versions ;
- inventaire des fonctionnalités/routes et dépendances entre modules ;
- CRUD Clients post-Banani ;
- Security Baseline, `/security-saas`, Zod, auth et rate limiting ;
- runtime, responsive, Mobile WebView, UI, hydratation et SEO ;
- staging Vercel obligatoire avant Production ;
- syntaxe Node/Shell, JSON, imports locaux, conflits Git et scripts npm ;
- nettoyage des artefacts transitoires.

## Premier démarrage

`npm run first-run` ne modifie aucune configuration et indique ce qui manque.

`npm run first-run:install` peut lancer `npm install` après les contrôles préalables. Il ne lance pas le wizard de configuration et n’écrase jamais `.env.local` ou `africa-saas.config.json`.
