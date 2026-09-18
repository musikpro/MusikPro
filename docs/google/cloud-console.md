# Google Cloud Console — configuration recommandée

Africa SaaS Kit utilise Google Cloud principalement pour :

- **Connexion Google** via Better Auth ;
- **OAuth 2.0** pour les APIs Google optionnelles (Search Console, Drive, etc.) ;
- gestion centralisée des identifiants et consentements.

## 1. Créer le projet

Créer un projet dédié au SaaS dans Google Cloud Console. Éviter de réutiliser un projet personnel sans rapport avec l'application.

## 2. Configurer Google Auth Platform / écran de consentement

Renseigner le nom de l'application, l'email support, les domaines autorisés et les liens légaux de production.

## 3. Créer un client OAuth « Web application »

Ajouter les URI de redirection :

```text
http://localhost:3000/api/auth/callback/google
https://votre-domaine.com/api/auth/callback/google
```

Puis configurer :

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

`GOOGLE_CLIENT_SECRET` est strictement serveur. Ne jamais le préfixer par `NEXT_PUBLIC_`.

## 4. APIs supplémentaires

N'activer que les APIs réellement utilisées. Pour Search Console, activer l'API Search Console et demander le scope `webmasters.readonly` seulement au moment où l'administrateur veut connecter ses données SEO.

## 5. Sécurité

- limiter les URI de redirection aux domaines exacts ;
- utiliser HTTPS en production ;
- supprimer les anciens clients OAuth inutilisés ;
- séparer si nécessaire les projets dev/staging/prod ;
- ne jamais commiter un JSON de compte de service ;
- si un compte de service est utilisé, limiter ses rôles au strict nécessaire.
