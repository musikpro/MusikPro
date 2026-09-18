# Cloudinary — uploads d'images optionnels

Cloudinary est **optionnel** dans Africa SaaS Kit. Un SaaS sans upload d'images doit pouvoir ignorer complètement cette intégration.

## Principe

- Le navigateur n'obtient jamais `CLOUDINARY_API_SECRET`.
- Le starter expose `POST /api/uploads/images`, authentifié par Better Auth.
- L'upload est signé côté serveur puis envoyé à Cloudinary.
- Types autorisés par défaut : JPEG, PNG, WebP, AVIF et GIF.
- SVG est refusé par défaut pour réduire les risques de contenu actif.
- Taille maximale : 10 MB.

## Variables

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=africa-saas-kit
```

`CLOUDINARY_API_SECRET` est un secret serveur. Il ne doit jamais être préfixé `NEXT_PUBLIC_`.

## Activation tardive

Cloudinary est proposé en Phase 18 de `/setup-saas`, après le staging et avant la validation finale production.

- Sans Cloudinary : `npm run cloudinary:setup -- --none` puis phase `skipped`.
- Avec Cloudinary : `npm run cloudinary:setup`, renseigner les variables, puis tester réellement un upload et plusieurs refus de sécurité.

## À adapter au SaaS

Le endpoint du starter exige un utilisateur connecté. Si le produit a besoin d'un upload public (ex. formulaire de candidature avant compte), créer un endpoint séparé avec rate limiting, anti-bot, limites de taille/type et politique métier dédiée — ne pas retirer simplement l'authentification du endpoint existant.

## Public vs privé

L'adaptateur inclus est prévu pour des **images publiques** (avatars, logos, images de posts). Une `secure_url` signifie HTTPS, pas contrôle d'accès privé. Pour KYC, pièces d'identité, factures ou documents confidentiels, utiliser une stratégie Cloudinary authenticated/private delivery ou un proxy serveur autorisé ; ne pas réutiliser directement `/api/uploads/images` pour ces documents.

Le serveur vérifie à la fois le MIME déclaré et la signature binaire (magic bytes) pour JPEG, PNG, GIF, WebP et AVIF. Un fichier renommé avec une fausse extension/MIME est refusé.
