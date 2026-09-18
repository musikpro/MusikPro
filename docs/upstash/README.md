# Upstash Redis dans Africa SaaS Kit

Upstash est **optionnel**. Il complète Neon ; il ne le remplace pas.

## Ce qu'il apporte

- cache serverless pour éviter certaines lectures répétées vers Neon ;
- rate limiting partagé entre les instances Vercel ;
- compteurs et états temporaires ;
- faible latence via l'API REST Redis.

Pour un cache, utiliser des TTL. Neon reste la source de vérité : si Upstash est vide ou indisponible, l'application doit pouvoir recharger la donnée depuis Neon.

## Configuration

```bash
npm run upstash:setup
```

Renseigner ensuite, uniquement côté serveur :

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Validation :

```bash
npm run upstash:check
npm run upstash:check:online
```

Pour ne pas utiliser Upstash :

```bash
npm run upstash:setup -- --none
```

## Sécurité

- ne jamais préfixer le token avec `NEXT_PUBLIC_` ;
- ne jamais le coller dans le chat ;
- `.env.local` doit rester ignoré par Git ;
- ne pas mettre de données critiques dont Redis serait l'unique copie.

## QStash / Workflow

QStash/Workflow est une capacité séparée pour les tâches asynchrones, retries et workflows longs. Elle n'est pas activée automatiquement par cette phase afin d'éviter du plumbing inutile. Elle pourra être ajoutée lorsqu'un SaaS a réellement des jobs longs ou fiables à exécuter.
