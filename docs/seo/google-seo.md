# SEO Google & aperçus de partage — Africa SaaS Kit

## Objectif
Le kit prépare chaque page publique pour le crawl, l'indexation et le partage. Il ne promet jamais une position Google : le classement dépend aussi de la qualité/pertinence du contenu, de la performance, des liens, de la concurrence et de nombreux signaux externes.

## Ce qui est fourni
- Metadata API Next.js : title, description, canonical, robots.
- Open Graph + Twitter Card avec image 1200×630.
- `app/opengraph-image.tsx` comme image sociale par défaut.
- favicon + manifest.
- `sitemap.xml` dynamique.
- `robots.txt` avec exclusion des espaces privés.
- vérification Google Search Console via `GOOGLE_SITE_VERIFICATION`.
- JSON-LD sur les pages publiques lorsque le type Schema.org est réellement pertinent.
- `noindex` sur auth, dashboard, admin et setup.

## Règle pour chaque nouvelle page publique
Avant de déclarer une page terminée :
1. définir un title unique et descriptif ;
2. définir une description utile et non dupliquée ;
3. définir sa canonical ;
4. décider index/noindex ;
5. ajouter la route au sitemap si elle est indexable ;
6. fournir une image Open Graph pertinente (image par défaut acceptée, image spécifique préférable pour une page importante) ;
7. vérifier la hiérarchie H1/H2, les liens internes et les textes alternatifs des images utiles ;
8. n'ajouter du JSON-LD que si les données structurées correspondent réellement au contenu visible ;
9. tester la page mobile-first et les Core Web Vitals ;
10. après déploiement, inspecter l'URL dans Search Console.

## Aperçu WhatsApp / Facebook / LinkedIn / X
Les plateformes utilisent principalement Open Graph et/ou Twitter Card. Le kit fournit une image 1200×630 par défaut. Pour une page importante, passer une image spécifique à `buildMetadata({ image: '/...' })` ou créer un `opengraph-image.tsx` dans le segment de route concerné.

## Pages privées
Ne jamais indexer les espaces utilisateurs ou techniques : `/dashboard`, `/admin`, `/setup`, `/api`, login, register, reset password, 2FA. Elles sont exclues du sitemap et configurées `noindex`.

## Search Console
1. Déployer avec le vrai domaine HTTPS.
2. Ajouter la propriété Domain dans Google Search Console.
3. Ajouter la valeur de vérification à `GOOGLE_SITE_VERIFICATION` si la méthode meta tag est utilisée, ou faire la vérification DNS recommandée pour une propriété Domain.
4. Soumettre `/sitemap.xml`.
5. Inspecter les pages publiques stratégiques et demander l'indexation lorsque nécessaire.

## Gate SEO
Exécuter :
```bash
npm run seo:check
```
Puis, après déploiement :
```bash
npm run doctor:production:online
```
Le contrôle statique ne remplace pas Search Console ni un vrai test de partage social.
