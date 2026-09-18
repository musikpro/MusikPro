# Google Search Console — Africa SaaS Kit

Le kit prépare trois niveaux d'intégration :

1. **Vérification de propriété** avec `GOOGLE_SITE_VERIFICATION` injecté dans le `<head>` via les Metadata Next.js.
2. **SEO technique** avec `/sitemap.xml` et `/robots.txt` générés par Next.js.
3. **API Search Console (optionnelle)** via OAuth 2.0, en lecture seule par défaut.

## Vérification recommandée

Pour une propriété de domaine complète, privilégier la vérification DNS dans Search Console. Pour une propriété de préfixe d'URL, la balise HTML fonctionne avec :

```env
GOOGLE_SITE_VERIFICATION=la_valeur_content_donnee_par_google
```

Ne mettre que la valeur de `content`, pas toute la balise `<meta>`.

## Sitemap

Une fois le site en production, soumettre :

```text
https://votre-domaine.com/sitemap.xml
```

## API Search Console

Activer l'API Google Search Console dans le projet Google Cloud, puis demander le scope minimal :

```text
https://www.googleapis.com/auth/webmasters.readonly
```

Le module `lib/google/search-console.ts` fournit des helpers serveur pour lister les propriétés accessibles et interroger Search Analytics. Ne jamais passer un access token Google à un Client Component.
