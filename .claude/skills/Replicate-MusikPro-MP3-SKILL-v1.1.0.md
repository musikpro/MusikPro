---
name: replicate-musikpro-mp3
description: Intégrer Replicate ACE-Step 1.5 à MusikPro pour produire exclusivement des MP3, avec administration sécurisée, détection de nouvelles versions, tests de compatibilité, activation propriétaire, rollback, crédits, budgets et protections anti-régression.
---

# SKILL — Replicate API × MusikPro — MP3 uniquement

**Version :** 1.1.0  
**Vérification documentaire :** 2026-10-09  
**Évolution 1.1.0 :** gestion des mises à jour du modèle (détection, comparaison, validation, activation et retour arrière) sans remplacement automatique incontrôlé.  
**Application cible :** MusikPro / Africa SaaS Kit, Next.js côté serveur, TypeScript, Prisma, Neon PostgreSQL, déploiement Vercel, PWA + Capacitor.  
**Livrable :** une intégration *fonctionnelle* après configuration d'une vraie clé API et d'un stockage, non une simple maquette.

> **Instruction principale à Claude Code :** auditer d'abord le dépôt et `CLAUDE.md` (source de vérité du projet) ; adapter ces instructions aux modules existants ; implémenter proprement par étapes, sans supprimer ni casser les autres fournisseurs de génération musicale ni les flux Web, Desktop, Android et iOS. Ne jamais prétendre avoir testé l'API réelle sans clé fournie en environnement approprié.

## 0. Objectif et règles immuables

1. Un administrateur **propriétaire** peut ajouter, tester, remplacer, désactiver et superviser sa clé **Replicate** depuis son tableau de bord, sans retoucher les fichiers source.
2. Le navigateur, les journaux, le HTML rendu, les réponses JSON, les applications PWA/Capacitor et les outils d'analyse **ne voient jamais** les clés API, les clés de signature ni les valeurs chiffrées.
3. La configuration sensible s'affiche dans des **cases à fond gris** (`bg-muted` ou équivalent), masquées (`type="password"`), avec état « Configuré » ou « Non configuré ». Une case grisée **n'est pas forcément désactivée** : l'édition se fait uniquement après une action explicite et protégée « Modifier ». Ne pas réafficher l'ancien secret.
4. **Sortie MP3 uniquement :** transmettre systématiquement `audio_format: "mp3"` au modèle ; accepter, stocker, diffuser et proposer au téléchargement uniquement du MP3 effectivement validé. Ne jamais proposer un MP4, un conteneur vidéo ni un FLAC/WAV à l'utilisateur final.
5. Modèle par défaut **`fishaudio/ace-step-1.5`**, version initiale épinglée : **`74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85`** (signalée « Latest » sur la page des versions le 2026-10-09). **Ne pas suivre `latest` en production sans approbation.** Prévoir le gestionnaire de versions décrit en section 16. Un changement de version n’implique pas systématiquement une modification du skill ; une incompatibilité de schéma ou un nouveau modèle exige une mise à jour du code ET du skill.
6. Utiliser **des prédictions asynchrones** pour les chansons longues : le navigateur n'attend pas plusieurs minutes sur une seule requête HTTP. Le serveur reçoit les webhooks signés, avec interrogation de secours si besoin.
7. Persister le MP3 avant l'expiration du lien de sortie Replicate (environ **1 heure** pour les prédictions créées par API).
8. Séparer **coût fournisseur (USD)**, **crédits métier MusikPro**, prix au client et statut de facturation. Ne jamais confondre la durée de la chanson et le temps GPU facturé.
9. Valider **sur le serveur** les données, l'identité, le rôle, les budgets, les quotas, la propriété des jobs et les URLs de médias ; pas uniquement dans les composants React.
10. Respecter les règles du dépôt : Next.js reste serveur de référence ; PWA + Capacitor reste la stratégie mobile officielle ; aucun export statique imposé ; tests anti-régression obligatoires ; pas d'icône « Sparkles ».

## 1. Sources officielles à consulter et à revalider avant de coder

- Replicate, modèle et paramètres : https://replicate.com/fishaudio/ace-step-1.5
- Page API du modèle : https://replicate.com/fishaudio/ace-step-1.5/api
- Version de modèle utilisée : https://replicate.com/fishaudio/ace-step-1.5/versions/74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85
- Liste des versions : https://replicate.com/fishaudio/ace-step-1.5/versions
- Documentation versioning : https://replicate.com/docs/topics/models/versions
- Référence API pour `models.get`, `models.versions.list`, `models.versions.get` : https://replicate.com/docs/reference/http/
- Prédictions asynchrones : https://replicate.com/docs/topics/predictions/create-a-prediction
- Référence HTTP : https://replicate.com/docs/reference/http
- Cycle de vie et statuts : https://replicate.com/docs/topics/predictions/lifecycle
- Webhooks : https://replicate.com/docs/topics/webhooks/
- Réception, doublons et retries : https://replicate.com/docs/topics/webhooks/receive-webhook
- Vérification cryptographique des webhooks : https://replicate.com/docs/topics/webhooks/verify-webhook
- Sorties audio et fichiers : https://replicate.com/docs/topics/predictions/output-files
- Conservation et expiration : https://replicate.com/docs/topics/predictions/data-retention
- Facturation : https://replicate.com/docs/topics/billing
- Crédits prépayés : https://replicate.com/docs/topics/billing/prepaid-credit
- Jetons API : https://replicate.com/account/api-tokens
- Portail de facturation : https://replicate.com/account/billing
- Licence officielle du modèle source (MIT affichée par le fournisseur du modèle, sous réserve des CGU du service) : https://huggingface.co/ACE-Step/Ace-Step1.5

**Attention aux changements :** la version du modèle peut évoluer et les anciennes versions ont parfois des valeurs par défaut différentes (`audio_format` notamment). Ne **jamais** dépendre du format par défaut : envoyer explicitement `"mp3"`. Si la documentation ou le schéma live contredit les exemples ci-dessous, consigner l'écart et adapter avec un test de non-régression.

## 2. Préflight obligatoire dans le dépôt

Avant toute mutation :

- Lire `CLAUDE.md` intégralement, puis les skills déjà installés sous `.claude/skills/` et les règles locales complémentaires. Ne pas installer ni réintroduire Codex/ChatGPT comme agent de développement.
- Identifier la version Next.js, la structure App Router ou Pages Router, TypeScript, le fournisseur d'authentification et les gardes RBAC déjà utilisés, les tables Prisma, l'implémentation du portefeuille de crédits, la gestion des commandes/chansons, le stockage fichier et le moteur de tâches.
- Identifier Musicful, MusicGPT et les autres adaptateurs existants ; **ajouter Replicate en tant que provider** sans remplacer les autres intégrations.
- Vérifier `.env.local`, `.gitignore`, les variables sur staging/production, les migrations Prisma et les accès Neon.
- Réutiliser l'UI/design system et les composants sécurisés existants au lieu d'en dupliquer.
- Si Neon n'est pas encore configuré, conserver `npm run dev` exécutable après installation des dépendances ; afficher l'état « Base de données non configurée » et protéger les routes DB sans faire échouer le démarrage global.
- Afficher les nouveaux indicateurs dans **État de préparation / État production** : API configurée, webhook vérifiable, stockage MP3 opérationnel, worker/reconciliation opérationnel, sécurité des secrets, restrictions propriétaire, tests.
- S'assurer qu'aucun code serveur / secret ne soit importé dans un composant `"use client"`.

### Ordre recommandé d'implémentation

**Phase A — Infrastructure :** schéma, adaptation du dépôt, chiffrement, configuration et UI propriétaire.  
**Phase B — Provider :** client serveur, validation, création d'une prédiction, lecture/cancel, normalisation des statuts.  
**Phase C — Livraison :** signature webhook, déduplication, ingestion MP3 privée, lecteurs/téléchargement.  
**Phase D — Production :** portefeuille, prix/coûts, budgets, backoff, métriques, alertes, tests, staging, documentation et gates de readiness.

## 3. Expérience propriétaire : page « Intégrations → IA musicale → Replicate »

Créer une carte premium, responsive, harmonisée au tableau de bord propriétaire :

| Champ propriétaire | Type / UI | Sécurité / fonction |
|---|---|---|
| Fournisseur | `Replicate` (lecture seule) | Ne pas accepter un host personnalisé libre |
| Activer Replicate | Switch | Propriétaire seul ; défaut `false` tant que non testé |
| Clé API Replicate | Case **grise**, `password`, état `••••••••` | À la saisie seulement ; jamais renvoyée par GET |
| Tester la connexion | Bouton | Appel serveur à `GET /v1/account`, sans génération payante |
| Compte Replicate | Texte non sensible | Afficher username/type reçu lors du test |
| Modèle | Lecture seule / sélection contrôlée | Par défaut `fishaudio/ace-step-1.5` |
| Version active | Champ grisé en lecture seule | Hash épinglé utilisé pour les nouvelles générations |
| Dernière version détectée | Champ grisé en lecture seule | Interrogation du modèle côté serveur ; ne déclenche pas de déploiement |
| Vérifier les mises à jour | Bouton propriétaire | Récupère la liste et les schémas depuis Replicate, sans génération payante |
| Tester la version candidate | Bouton propriétaire protégé | Contrôles de schéma gratuits + génération réelle de test uniquement après approbation du coût |
| Activer / Retour arrière | Boutons propriétaire avec confirmation | Promotion atomique de la version approuvée ; rollback sur l’ancienne version |
| Format de sortie | Badge/texte **MP3 uniquement** | Fixe ; pas de menu MP4/WAV/FLAC |
| Durée autorisée | Intervalle configurable | `30–600` secondes ou intervalle métier plus restreint |
| Batch maximum | Nombre `1–4` | Défaut 1 ; 2 pour deux propositions si voulu |
| Mode paroles | Chant / Instrumental | Instrumental envoie `[Instrumental]` |
| Prix client | Crédits MusikPro | Distinct du coût fournisseur ; éditable propriétaire |
| Coût fournisseur estimé | USD / prédiction | Modèle de calcul paramétrable, pas une facture officielle |
| Budget mensuel interne | USD | Bloquer nouvelles générations en cas de seuil atteint |
| Concurrence / quota | Nombre | Contrôle avant génération et par utilisateur |
| Stockage MP3 | État | Bucket et permissions côté serveur, jamais les clés publiques |
| URL webhook | Lecture seule + Copier | Construite à partir de l'URL publique approuvée du SaaS |
| Dernier test / dernière erreur | État | Message expurgé, horodatage |
| Dernières générations | Tableau | statut, durée, propriétaire, débit crédit, USD estimés, latence, MP3 |
| Dernier traitement webhook | Voyant | État de santé et test de validation |

Exemples d'états : **Non configurée**, **Clé enregistrée**, **Connexion vérifiée**, **Erreur d'authentification**, **Désactivé**, **Stockage indisponible**.

### Comportement précis de la clé

- GET des réglages : `apiKeyConfigured: boolean`, `accountLabel`, `lastTestAt`, `enabled`, etc. **Jamais** de secret, même partiellement chiffré ; un suffixe de clé n'est pas nécessaire.
- En saisie : fond gris premium, `type="password"`, `autocomplete="new-password"`, bouton révéler limité à la saisie temporaire (ne jamais révéler la clé déjà sauvegardée).
- POST/PATCH secret : action propriétaire + protection CSRF selon mécanisme du dépôt + `Cache-Control: no-store` ; tests d'accès à la route.
- « Remplacer » : saisie d'une nouvelle clé, validation via `/v1/account`, remplacement chiffré, rafraîchissement du secret webhook ; ne pas modifier la valeur active tant que le test échoue.
- « Supprimer » : confirmation, désactivation des futurs appels. Pour les jobs en cours, conserver le minimum nécessaire à leur réconciliation selon politique de rotation et de sécurité.
- Ne jamais stocker dans `localStorage`, `sessionStorage`, IndexedDB, cookies, `.env` exposé, préfixe `NEXT_PUBLIC_`, ni hydrater le secret dans React.
- Vérifier `OWNER` **côté serveur** pour chaque lecture/écriture ; un simple bouton caché n'est pas une autorisation.

## 4. Secrets, chiffrement, clés et environnements

**Stratégie recommandée :** garder une **clé maîtresse de chiffrement** dans le secret manager d'hébergement, et le jeton Replicate dans une table de configuration chiffrée à écriture réservée au propriétaire.

Exemple `.env.local` (aucune vraie valeur, jamais à commiter) :

```dotenv
# Configuration serveur (NE PAS préfixer NEXT_PUBLIC_)
MUSIKPRO_CREDENTIALS_KEY_BASE64=<32_octets_aleatoires_encodes_en_base64>
MUSIKPRO_PUBLIC_BASE_URL=https://staging.exemple.com
MUSIKPRO_PRIVATE_AUDIO_BUCKET=<bucket_prive>
# Optionnel : token uniquement pour un bootstrap/local isolé
REPLICATE_API_TOKEN=
# Selon projet : DATABASE_URL, stockage, auth, queue, etc.
```

- AES-256-GCM avec IV aléatoire 12 octets **différent par chiffrement**, auth tag, version de format et `keyId`; rejeter si tag invalide ; rotation documentée et auditée.
- Interdire toute réponse contenant `token`, `Authorization`, clé cryptographique, `whsec_`, variables d'environnement sensibles, corps du webhook contenant données privées ou logs non expurgés.
- Le secret de signature webhook récupéré via `GET https://api.replicate.com/v1/webhooks/default/secret` reste serveur, en cache sécurisé/chiffré, avec rotation en cas de changement de compte Replicate.
- Le token UI, lorsqu'il est configuré et validé, est la source active ; l'éventuel token `.env` est réservé au développement/bootstrapping et doit avoir une priorité et une décommission documentées.
- Le service traite uniquement `https://api.replicate.com`, avec TLS ; les rôles utilisateurs ne fournissent jamais une URL API arbitraire.

## 5. Schéma Prisma — proposition adaptable (ne pas créer de modèles concurrents)

**Noms illustratifs :** fusionner avec le schéma réel si des tables similaires existent. Définir de véritables relations vers `User`/`Song` du projet.

```prisma
model AiProviderSetting {
  id                 String   @id @default(cuid())
  provider           String   @unique // "replicate"
  enabled            Boolean  @default(false)
  encryptedToken     String?  @db.Text
  encryptedWebhookKey String? @db.Text
  modelName          String   @default("fishaudio/ace-step-1.5")
  modelVersion       String   @default("74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85")
  previousModelVersion String? // uniquement pour rollback validé
  candidateModelVersion String? // version détectée, jamais auto-activée
  modelLastCheckedAt DateTime?
  modelLastPromotedAt DateTime?
  modelUpdateStatus String? // none|available|blocked|tested|approved|active|rolled_back
  maxDurationSeconds Int      @default(600)
  maxBatchSize       Int      @default(1)
  monthlyLimitUsd    Decimal? @db.Decimal(12, 4)
  ownerAccountLabel  String?
  lastCheckedAt      DateTime?
  lastErrorCode      String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model MusicGenerationJob {
  id                 String   @id @default(cuid())
  userId             String
  provider           String   @default("replicate")
  idempotencyKey     String
  predictionId       String?  @unique
  providerVersion    String
  status             String   @default("reserved")
  title              String?
  prompt             String   @db.Text
  lyrics             String   @db.Text
  durationSeconds    Int
  batchSize          Int      @default(1)
  creditsReserved    Int      @default(0)
  creditsDebited     Int      @default(0)
  inputSnapshot      Json
  outputCount        Int      @default(0)
  providerGpuSeconds Decimal? @db.Decimal(12, 3)
  estimatedCostUsd   Decimal? @db.Decimal(12, 6)
  providerErrorCode  String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  finishedAt         DateTime?
  @@unique([userId, idempotencyKey])
  @@index([userId, createdAt])
  @@index([status, updatedAt])
}

model MusicGenerationAsset {
  id           String   @id @default(cuid())
  jobId        String
  outputIndex  Int
  storageKey   String   @unique
  mimeType     String   @default("audio/mpeg")
  format       String   @default("mp3")
  sizeBytes    BigInt
  durationSec  Int?
  sha256       String?
  createdAt    DateTime @default(now())
  @@unique([jobId, outputIndex])
  @@index([jobId])
}

model ReplicateWebhookDelivery {
  id             String   @id // webhook-id signé par Replicate
  predictionId   String
  status         String
  processedAt    DateTime @default(now())
}
```

**Important :** les relations absentes du bloc illustratif doivent être **renseignées conformément au dépôt** avant la migration. Ne pas copier-coller tel quel si cela casse le schéma existant ; ajouter index, contraintes et politiques de conservation. Utiliser la table historique des crédits existante et une transaction DB atomique plutôt que créer un portefeuille parallèle.

## 6. Modèle ACE-Step 1.5 : champs API et valeurs conseillées

Schéma actuellement observé sur `fishaudio/ace-step-1.5` :

| Propriété API | Type et limites | Configuration conseillée |
|---|---|---|
| `prompt` | string ; max **512 caractères** | Brief musical : genre, tempo, instruments, émotion, accents |
| `lyrics` | string ; max **4096 caractères** | Paroles ; `[Instrumental]` pour instrumental |
| `duration` | number ; **-1 ou jusqu'à 600 s** | 240 pour chanson de 4 min ; -1 en mode auto avancé |
| `bpm` | integer optionnel ; **30 à 300** | Omettre pour auto |
| `key_scale` | string | `""` pour auto ; ex. `C major` |
| `time_signature` | chaîne, auto ou valeurs admises | `"auto"` |
| `inference_steps` | integer ; **1 à 200** | 8 pour turbo (4–8 recommandés) |
| `guidance_scale` | number ; **1 à 15** | 7 (ignoré si turbo) |
| `shift` | number ; **1 à 5** | 3 pour turbo |
| `seed` | integer | -1 pour aléatoire |
| `thinking` | boolean | true |
| `batch_size` | integer ; **1 à 4** | 1 ; passer à 2 uniquement sur choix explicite |
| `audio_format` | string | **`"mp3"` verrouillé** |

**Note :** le schéma exact dépend de la version épinglée. Introspecter/revérifier les paramètres au déploiement, puis figer la version et les valeurs par défaut testées. Ne pas prétendre que la durée cible implique une durée identique à la seconde dans le fichier final.

### Validation Zod côté serveur — exemple exploitable

```ts
import { z } from "zod";

export const musicInputSchema = z.object({
  prompt: z.string().trim().min(3).max(512),
  lyrics: z.string().max(4096).default("[Instrumental]"),
  durationSeconds: z.number().int().min(30).max(600).default(240),
  bpm: z.number().int().min(30).max(300).optional(),
  keyScale: z.string().max(40).default(""),
  timeSignature: z.enum(["auto", "2", "3", "4", "6"]).default("auto"),
  seed: z.number().int().default(-1),
  batchSize: z.number().int().min(1).max(4).default(1),
  instrumental: z.boolean().default(false),
  idempotencyKey: z.string().uuid(),
});

export function toReplicateInput(v: z.infer<typeof musicInputSchema>) {
  return {
    prompt: v.prompt,
    lyrics: v.instrumental ? "[Instrumental]" : v.lyrics,
    duration: v.durationSeconds,
    ...(v.bpm ? { bpm: v.bpm } : {}),
    key_scale: v.keyScale,
    time_signature: v.timeSignature,
    seed: v.seed,
    shift: 3,
    guidance_scale: 7,
    thinking: true,
    inference_steps: 8,
    batch_size: v.batchSize,
    audio_format: "mp3" as const,
  };
}
```

**Portée :** ne pas exposer `audio_format` comme champ dans les données clients ; une requête forgée ne doit pas pouvoir le remplacer.

### Exemples de briefs musicaux (ne pas promettre un accent exact)

**Zouglou ivoirien :** `Ivorian zouglou, warm live percussion, syncopated guitar, melodic bass, lively handclaps, communal call-and-response vocals, joyful Abidjan street-party atmosphere, natural African French phrasing.`

**Coupé-décalé :** `Ivorian coupé-décalé, fast dance groove, punchy kick, bright synth stabs, percussive patterns, energetic bass, party shouts and rhythmic call-and-response.`

**Afrobeats / Naija Pop :** `Modern Nigerian afrobeats, 108 BPM, shakers, talking drums, warm bass, bright guitars, catchy sung chorus, smooth lead vocals, club-ready mix.`

**Louange / Adoration :** `West African gospel praise, gentle piano opening, rich choir harmonies, expressive lead vocals, handclaps, warm live bass and uplifting worship arrangement.`

Le choix des langues et styles se traduit en `prompt`/`lyrics`. Le modèle peut produire un accent approximatif ; **aucune garantie de voix ivoirienne exacte ni de clonage de voix** avec ces seuls champs API. Toute fonction d'import de voix personnelle exigerait un autre pipeline explicitement autorisé et la preuve du consentement.

## 7. Client HTTP serveur Replicate (préféré pour la création async)

**Méthode documentée** pour ce modèle communautaire :

```http
POST https://api.replicate.com/v1/predictions
Authorization: Bearer <TOKEN_SERVEUR>
Content-Type: application/json
```

**JSON type** (remplacer seulement les champs choisis ; ne jamais exposer le token) :

```json
{
  "version": "fishaudio/ace-step-1.5:74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85",
  "input": {
    "prompt": "Ivorian zouglou, warm guitars, dancing bass, call-and-response vocals",
    "lyrics": "[Verse]\nBienvenue à Abidjan...\n[Chorus]\nOn danse ensemble !",
    "duration": 240,
    "time_signature": "auto",
    "inference_steps": 8,
    "guidance_scale": 7,
    "shift": 3,
    "seed": -1,
    "thinking": true,
    "batch_size": 1,
    "audio_format": "mp3"
  },
  "webhook": "https://staging.exemple.com/api/webhooks/replicate?job=<UUID_JOB>",
  "webhook_events_filter": ["completed"]
}
```

**Privilégier** le mode async, sans `Prefer: wait`. L'API renvoie un objet avec `id`, `status`, `urls.get`, etc. Conserver `id` comme `predictionId`, **ne pas** considérer l'acceptation HTTP comme une génération réussie.

### Exemple de fonction TypeScript (serveur uniquement)

```ts
import "server-only";

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled" | "aborted";
  output?: unknown;
  metrics?: { predict_time?: number; total_time?: number };
  error?: string | null;
};

const BASE = "https://api.replicate.com/v1";

export async function createReplicatePrediction(args: {
  token: string;
  version: string;
  input: Record<string, unknown>;
  webhook: string;
}): Promise<Prediction> {
  const response = await fetch(`${BASE}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: `fishaudio/ace-step-1.5:${args.version}`,
      input: { ...args.input, audio_format: "mp3" },
      webhook: args.webhook,
      webhook_events_filter: ["completed"],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    // Ne pas retourner brut : les corps et logs peuvent contenir des données privées.
    throw new Error(`REPLICATE_CREATE_${response.status}`);
  }
  return (await response.json()) as Prediction;
}

export async function getReplicatePrediction(token: string, id: string) {
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error("INVALID_PREDICTION_ID");
  const response = await fetch(`${BASE}/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`REPLICATE_GET_${response.status}`);
  return (await response.json()) as Prediction;
}
```

**Note d'ingénierie :** ceci est un exemple de la **couche transport** et ne représente pas à lui seul une route métier prête pour la production ; autour de cet appel, exiger session, droits, quotas, réservation des crédits, transaction Prisma, traçabilité, protections contre les doubles soumissions et réconciliation réseau. Les timeouts de requête **ne prouvent pas** que Replicate n'a pas accepté une prédiction : ne pas relancer aveuglément un POST après un timeout si son état est incertain.

### Endpoints serveur internes à créer ou adapter

- `GET /api/owner/integrations/replicate` : réglages publics non sensibles du propriétaire.
- `PATCH /api/owner/integrations/replicate` : mise à jour réglages (RBAC propriétaire).
- `POST /api/owner/integrations/replicate/credentials` : ajout/remplacement token avec chiffrement.
- `POST /api/owner/integrations/replicate/test` : connexion sans coût via `GET /v1/account`.
- `POST /api/music/generations` : créer job métier + réserver crédits + lancer prédiction.
- `GET /api/music/generations/:id` : obtenir statut de **son** job (ou propriétaire).
- `POST /api/music/generations/:id/cancel` : demander annulation, sans remboursement immédiat non justifié.
- `POST /api/webhooks/replicate` : entrée publique, **signature cryptographique impérative**.
- `GET /api/music/generations/:id/download/:assetId` : autorisation, URL signée courte durée ou flux contrôlé `audio/mpeg`.
- Job périodique interne de réconciliation : prédictions en attente, webhooks perdus, téléchargement en échec.

**Routes dynamiques Next.js :** utiliser exactement la convention Router présente dans le dépôt. Appliquer `Cache-Control: no-store` aux requêtes privées. Adapter le CSRF aux protections déjà en place.

## 8. Webhook signé — implémentation de référence

Replicate signe avec `webhook-id`, `webhook-timestamp` et `webhook-signature`. Clé via `GET /v1/webhooks/default/secret` (préfixe `whsec_`). Vérifier l'**octet brut du corps**, le HMAC-SHA256 en base64, la version `v1` et une fenêtre anti-rejeu de 5 minutes.

### Exemple TypeScript de vérification (Node.js)

```ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyReplicateWebhook(args: {
  rawBody: string;
  headers: Headers;
  webhookSecret: string;
}): boolean {
  const id = args.headers.get("webhook-id");
  const timestamp = args.headers.get("webhook-timestamp");
  const signatureHeader = args.headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const t = Number(timestamp);
  if (!Number.isSafeInteger(t) || Math.abs(Math.floor(Date.now() / 1000) - t) > 300) {
    return false;
  }
  if (!args.webhookSecret.startsWith("whsec_")) return false;
  const key = Buffer.from(args.webhookSecret.slice("whsec_".length), "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${args.rawBody}`, "utf8")
    .digest();
  return signatureHeader.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    const actual = Buffer.from(part.slice(3), "base64");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
```

**Handler :** récupérer `await request.text()` avant JSON.parse ; vérifier avant toute mutation DB. Exiger POST, HTTPS en production, taille maximale du corps, ID et statut valides. Valider le `predictionId` de la payload et l'ID de job lié, ou rapprocher un job encore en état `submitting`. Dans une transaction, créer une ligne `ReplicateWebhookDelivery` unique par `webhook-id`; si existe, répondre 2xx sans recommencer. Les webhooks peuvent arriver plusieurs fois ou hors ordre ; **jamais de transition d'un état terminal vers `processing`**. Sur `succeeded`, enregistrer une tâche de copie MP3 **immédiate** ; répondre rapidement et déclencher worker durable. En l'absence de queue fiable, télécharger en traitement contrôlé avant réponse si réalisable dans les limites de runtime, sinon utiliser une queue fiable ; une tâche en mémoire `void copyFile()` dans une fonction serverless n'est pas fiable.

Si l'ID de prédiction est inconnu, ne pas associer le webhook à un utilisateur arbitraire ; stocker l'événement vérifié pour réconciliation et investigation. Ne pas recevoir les webhooks par URL qui redirige. Après 1 heure, le média peut être irrécupérable : générer une alerte d'incident.

## 9. Pipeline MP3 de bout en bout

1. Sur `succeeded`, vérifier que `output` est un **tableau de fichiers** ; si un autre type apparaît, signaler `INVALID_PROVIDER_OUTPUT` sans erreur de sécurité.
2. Pour chaque élément (`batch_size` 1–4) : extraire l'URL HTTPS, **accepter uniquement les domaines autorisés de diffusion Replicate** (`replicate.delivery` et leurs sous-domaines exacts, pas une sous-chaîne approximative).
3. Faire le **téléchargement uniquement côté serveur**, timeout, limites de taille, de durée et de redirects (ne pas suivre aveuglément une redirection vers réseau privé/metadata).
4. Vérifier le format réel **MP3** : contrôles de réponse, signature audio / `ffprobe` dans le worker audio si disponible ; ne pas déduire le format de l'extension de l'URL. Refuser un fichier non MP3 ; ne pas l'exposer sous une extension `.mp3` trompeuse.
5. Stocker dans un bucket **privé**, clé construite côté serveur : `music/replicate/<userId>/<jobId>/<index>.mp3` (normaliser les IDs ; pas de nom de fichier fourni librement).
6. Enregistrer métadonnées : taille, type `audio/mpeg`, SHA-256, durée mesurée, URI interne, index, date, statut.
7. Publier la chanson au client **seulement après** copie et validation réussies ; stocker `downloadReadyAt` selon schéma existant.
8. Dans l'UI MusikPro : lecteur `<audio>`, bouton **Télécharger MP3**, historique personnel ; autoriser par session utilisateur ou lien signé très court, avec `Content-Disposition: attachment; filename="musikpro-<jobId>.mp3"`.
9. Garder l'accès restreint aux seuls propriétaires autorisés. Pas d'URL Replicate temporaire dans les données métier persistantes ni d'URL de bucket public non protégée.
10. Retenter **uniquement l'ingestion d'un résultat existant**, avec idempotence `(jobId, outputIndex)` ; ne pas relancer une génération payante pour une erreur de stockage sans décision produit explicite.

### MP3 et sécurité réseau

- Filtrer URL *avant* téléchargement ; utiliser DNS/IP anti-SSRF, aucun schéma non HTTPS, redirects manuels vérifiés ou interdits.
- Protéger contre les payloads disproportionnés (Content-Length **et** taille du flux, pas seulement les en-têtes), les formats falsifiés, les fichiers vides et les fichiers malveillants.
- Selon le CDN, les fichiers peuvent être servis sans en-tête Authorization ; s'appuyer sur la documentation des fichiers Replicate. **Ne jamais** transmettre la clé à des domaines tiers non documentés.
- PWA/Capacitor : téléchargement via flux sécurisé du backend, sans stocker le jeton API Replicate dans les applications ; éviter de cacher des MP3 privés dans le service worker.

## 10. Cycle de vie, débit de crédits, idempotence et erreurs

États internes recommandés : `reserved`, `submitting`, `starting`, `processing`, `storing`, `succeeded`, `failed`, `canceled`, `aborted`, `storage_failed`, `reconciliation_required`.

**Workflow atomique métier :**

1. Valider utilisateur connecté, quantité, plan, prompts, limites, budgets, disponibilité provider, `idempotencyKey` fourni pour chaque clic effectif.
2. Réserver les crédits dans une **transaction sérialisable / garde atomique** ; insérer un seul job par `(userId, idempotencyKey)` ; ne pas débiter deux fois si deux requêtes arrivent simultanément.
3. Émettre un POST Replicate **unique** ; enregistrer `predictionId` dès la réponse ; le webhook porte l'ID de job pour assurer le rapprochement même en cas de course.
4. À `succeeded`, **attendre le MP3 stocké** avant de solder/consommer les crédits clients et présenter le média prêt. Appliquer la politique commerciale documentée si la génération réussit mais que le stockage échoue.
5. Sur `failed` et `aborted`, libérer/régulariser les crédits suivant règles produit ; sur `canceled`, prendre en compte le fait que Replicate peut avoir facturé le temps déjà exécuté ; ne pas confondre facture Replicate et remboursement client.
6. En cas de timeout réseau ambigu du POST : état `reconciliation_required`, recherche/reconciliation par fenêtre temporelle et compte Replicate si possible ; **ne pas** faire de retries automatiques qui créent une seconde chanson facturable.
7. Toute transition terminale, écriture de solde, émission d'actif et webhook est idempotente.

**Retours d'erreur à gérer :**

- `401/403` : jeton non valide/autorisations insuffisantes → désactiver test/provider si nécessaire, notifier admin.
- `402` / crédit insuffisant : informer propriétaire, arrêt des nouvelles demandes.
- `422` : paramètres/version modèle invalides → alerte technique, erreur utilisateur normalisée.
- `429` : limiter et différer avec `Retry-After` si disponible ; ne pas dupliquer les jobs déjà créés.
- `5xx`, timeout, indisponibilité : backoff borné ; prudence sur les créations ambiguës.
- `status=failed|aborted|canceled` : finaliser sans promettre un MP3 inexistant.
- `succeeded` mais MP3 absent/invalide : `storage_failed`, alerte, pas de lien de téléchargement.
- `webhook signature failed` : `401/403`, aucune mutation, log nettoyé.
- Néon indisponible : refuser proprement les nouveaux jobs, garder l'application et la page « État de préparation » opérationnelles.

## 11. Suivi des coûts Replicate et budgets MusikPro

- **Pay as you go** : pour les modèles matériels, Replicate affiche un coût indicatif et facture en fonction du temps de calcul réel. **Ne pas coder 0,099 $ comme prix contractuel fixe.** Vérifier le prix officiel avant communication et lorsque le matériel/la version évolue.
- Conserver par prédiction `metrics.predict_time` (secondes GPU) et, si disponible, `metrics.total_time`, `model/version`, `started_at/completed_at`.
- `estimatedCostUsd` = temps GPU × **taux USD/seconde validé pour le matériel/version à la date du job**, auquel s'ajoutent au besoin les coûts propres au SaaS (stockage, conversions éventuelles, frais externes). Le taux doit être paramétrable ; **ne pas le présenter comme facture Replicate définitive**. Si tarif exact incertain : marquer « estimation indisponible » plutôt que deviner.
- Pour `batch_size=2`, la sortie peut contenir 2 chansons mais le coût d'une prédiction peut augmenter : enregistrer à la fois le nombre de fichiers livrés et le coût **par prédiction**, puis calculer un coût par chanson livrée.
- Créer une page « Replicate — Consommation » : prédictions aujourd'hui/semaine/mois, durée totale GPU, coûts estimés USD, coût moyen par MP3 validé, échecs, coûts des réessais, solde crédits MusikPro consommés.
- Alertes budgétaires internes à 50 %, 80 %, 100 % ; au seuil dur, refuser les nouveaux jobs **avant** l'appel API. Ce plafond interne n'est **pas** un mécanisme de plafonnement du solde Replicate, et ne coupe pas forcément les traitements déjà démarrés.
- Ne pas prétendre lire automatiquement le **solde officiel Replicate** sans endpoint documenté adéquat : l'utilisateur peut gérer ses recharges sur `https://replicate.com/account/billing`.

## 12. Tests obligatoires

### Unitaire

- Zod : prompt vide, >512 caractères, lyrics >4096, durée hors bornes, batch hors bornes, forçage client `audio_format="mp4"` ignoré.
- `toReplicateInput` toujours `audio_format: "mp3"` ; test pour version fixée.
- Clé chiffrée AES-GCM : roundtrip, ciphertext aléatoire, clé/tag incorrects, rotation.
- RBAC : seul propriétaire voit/configure Replicate ; requêtes non autorisées 401/403.
- Vérification webhook : signature correcte, signature incorrecte, timestamp périmé, autre secret, payload modifié, plusieurs signatures versionnées, doublons.
- États : aucun `succeeded → processing` ; pas de double débit/asset en cas de webhook rejoué.

### Intégration avec mocks HTTP, storage et DB

- Test connexion `GET /v1/account` ; UI ne reçoit jamais la clé, même dans l'erreur.
- `POST /v1/predictions` contient le hash **actif approuvé** lu côté serveur et `audio_format: "mp3"` avec `webhook_events_filter: ["completed"]`.
- `starting → processing → succeeded → storing → prêt` : sortie `["https://…replicate.delivery/…"]` traitée et servie `audio/mpeg`.
- Batch 2 : deux objets MP3 uniques, aucun écrasement, facturation et crédits cohérents.
- Refus MP4/WAV/FLAC/mauvais MIME/mauvais octets et SSRF, sans rendre le lien disponible.
- Erreurs 401/402/429/5xx et délais ; sortie expirée ; queue indisponible ; webhook manquant ; réconciliation réussie.
- Deux POST simultanés même idempotencyKey → un job, un appel au provider, une réservation/débit.
- Accès à la chanson d'un autre utilisateur → 403/404 ; URL signée expirée invalide.
- Rotation token/webhook secret ; retry webhook ; ID inconnu.

### Production et non-régression

- `npm run lint`, `npm run typecheck`, `npm run build`, tests Prisma, tests API, tests e2e web/mobile si scripts existants ; adapter aux scripts du repo.
- Vérifier sans régression Musicful, MusicGPT, autres fournisseurs ; gestion des paroles ; paiement ; crédits ; accès utilisateur ; génération web/mobile ; téléchargements.
- Valider de bout en bout en **staging** avec une vraie clé Replicate et une courte génération **payante seulement si le propriétaire l'autorise**. Sans cette autorisation, faire des tests mocks et reporter « Test réel non exécuté ».
- Mettre à jour les indicateurs de readiness ; aucun secret dans l'artefact de build, les logs, ou les réponses HTTP.
- Le rapport final doit présenter les fichiers changés, les migrations, les endpoints, les tests et leurs résultats, les coûts éventuels, les risques, et une procédure de rollback.

## 13. Critères d'acceptation (Definition of Done)

- [ ] Tableau propriétaire Replicate présent, responsive, sécurisé, champs sensibles visuellement gris et masqués.
- [ ] Clé ajoutable/remplaçable/testable depuis l'UI sans toucher `.env.local`.
- [ ] Aucun secret accessible depuis le navigateur ou l'API non propriétaire.
- [ ] Replicate appelle la version `fishaudio/ace-step-1.5` validée et **active**, non une version `latest` changeante.
- [ ] Tableau propriétaire affiche version active, dernière détectée, statut des tests ; contrôles Vérifier / Tester / Activer / Retour arrière réservés au propriétaire.
- [ ] `audio_format` ne vaut **jamais** autre chose que `"mp3"`.
- [ ] Paroles, instrumental, durée 4 min, style zouglou, autres styles, batch 1 ou 2 fonctionnent.
- [ ] Génération asynchrone, progression, état final, webhook HMAC vérifié, retries sécurisés.
- [ ] MP3 téléchargé vers un stockage privé avant expiration Replicate.
- [ ] Téléchargement et lecture MP3 autorisés uniquement au propriétaire de la chanson.
- [ ] Crédit métier réservé et débité **une fois** ; budget et estimation des coûts opérationnels.
- [ ] Staging testé, Web/Desktop/PWA/Capacitor inchangés, aucune régression Musicful/MusicGPT.
- [ ] Voyants « État de production » mis à jour ; documentation technique et rapport de tests livrés.

## 14. Commandes pratiques côté développeur

```bash
# Depuis le dépôt, après vérification de son gestionnaire de paquets :
npm install replicate zod
# Ne lancer Prisma et les migrations qu'après avoir vérifié le schéma et la configuration DB.
# Le code HTTP natif utilisant fetch ne dépend pas directement du SDK replicate.
```

Exemple **manuel, à faire dans un terminal local avec un token privé, jamais dans le navigateur** :

```bash
export REPLICATE_API_TOKEN='COLLER_ICI_SEULEMENT_DANS_UN_TERMINAL_PRIVE'
curl --fail-with-body -sS \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/account
```

Cet appel **teste l'authentification** et ne génère pas de musique. Pour une prédiction réelle payante, utiliser la requête JSON de la section 7 après autorisation et configuration du webhook public.

## 15. Rapport d'intégration à rendre après implémentation

1. Résumé de l'existant inspecté (sans secret) et du design retenu.
2. Liste des fichiers créés/modifiés et schéma Prisma migré.
3. Capture ou description du tableau de bord propriétaire : cases grises et état de connexion.
4. Démo technique du flux `POST → prédiction → webhook vérifié → MP3 en bucket privé → téléchargement`.
5. Résultats des tests, y compris les tests **non exécutés** et pourquoi.
6. Budget / coût réel ou estimé, explicitement étiqueté ; aucun montant inventé.
7. Procédure d'ajout de clé, de rotation, de suppression, de rollback et de traitement des erreurs.

**Ne considérer le skill comme exécuté qu'une fois ces critères observables satisfaits.**


## 16. Gouvernance des mises à jour ACE-Step — obligatoire à partir de v1.1.0

### 16.1. Principe : dissocier la version du skill de celle du modèle

- **Skill (`SKILL.md`)** : instructions de développement et contrat d'intégration. Il **ne s'auto-actualise pas** lors de la publication d'un nouveau modèle Replicate. Une modification du skill requiert un changement de fichier validé dans le dépôt, puis une mise en œuvre/déploiement par Claude Code.
- **Version du modèle ACE-Step** : identifiée par un hash de version de 64 caractères sur Replicate. Tant que le schéma d'entrée/sortie demeure compatible, le propriétaire peut **promouvoir une nouvelle version déjà qualifiée via son tableau de bord**, sans réinstaller le skill ni recompiler le SaaS.
- **Nouveau nom/modèle majeur (par ex. hypothétique ACE-Step 2.x)** : ne PAS supposer l'existence d'un slug ou la compatibilité ; demander un nouvel adaptateur, une nouvelle configuration et la mise à jour du skill et du code après vérification documentaire.
- Le modèle communautaire doit être exécuté avec une version précise (champ `version` de `POST /v1/predictions`) ; ne pas déclencher les prédictions publiques par `latest` ou par le nom seul sans vérification du type « official model ». Pour `fishaudio/ace-step-1.5`, employer `fishaudio/ace-step-1.5:<hash approuvé>`.
- Le 2026-10-09, la liste web `https://replicate.com/fishaudio/ace-step-1.5/versions` affiche la version `74e3a7d3…` comme `Latest`. Cette date est une photographie documentaire, **pas un abonnement de mises à jour en temps réel**.

### 16.2. Contrôle officiel de nouvelles versions et schémas

Depuis le backend, exclusivement avec le secret administré par le propriétaire :

1. `GET https://api.replicate.com/v1/models/fishaudio/ace-step-1.5` : récupérer `latest_version.id` et `latest_version.openapi_schema`.
2. `GET https://api.replicate.com/v1/models/fishaudio/ace-step-1.5/versions` : présenter l'historique, puis utiliser `GET /v1/models/fishaudio/ace-step-1.5/versions/{id}` pour un détail spécifique.
3. Comparer la **version active** avec la version **candidate**, **sans la remplacer**. Enregistrer date, IDs, empreinte du schéma (hash canonique), état et un résumé de différences ; éviter de stocker secrets, paroles personnelles ou résultats bruts inutiles.
4. Comparer `openapi_schema.components.schemas.Input` et les schémas de sortie : champs ajoutés/supprimés, contraintes `required`, types, plages `minimum/maximum`, `enum`, valeurs par défaut et formes de sortie (chaîne, liste, objets). Une différence silencieuse doit être classée `requires_code_review` si le mapping actuel ne suffit plus.
5. Vérifier particulièrement `audio_format`: présence, acceptation de **`mp3`**, valeur forcée côté serveur, rejet de toute sortie non MP3. Ne JAMAIS remplacer la règle MP3 par le défaut du modèle.
6. Une erreur réseau, `401/403`, version introuvable ou schéma illisible doit laisser **la version active inchangée**. La détection n'a jamais le droit de suspendre les générations en cours.

Documentation : `https://replicate.com/docs/reference/http/`, `https://replicate.com/docs/topics/models/versions`.

### 16.3. Tableau de bord propriétaire — « Intégrations → IA musicale → Replicate → Versions ACE »

Afficher de façon lisible :

| Élément | Comportement |
|---|---|
| Version active | Hash court + hash complet copiable, lecture seule, fond gris |
| Dernière version Replicate détectée | Hash court, date du contrôle, badge « Identique » ou « Nouvelle version » |
| Versions précédentes | Historique avec date de qualification et nombre de jobs |
| Compatibilité | `compatible` / `requires_code_review` / `incompatible` / `unknown` |
| MP3 | Voyant obligatoire « MP3 validé » / « MP3 non validé » |
| Coût estimatif de test | Montant estimé ou « coût inconnu » ; aucune facture affichée comme certaine |
| Vérifier | Lecture seule des métadonnées ; aucune prédiction payante |
| Tester | Contrôles automatisés de schéma ; génération courte réelle seulement après consentement explicite du propriétaire et limite budgétaire |
| Activer | Confirmation propriétaire ; exige tous les contrôles réussis et une version candidate approuvée |
| Retour arrière | Restaure le dernier hash approuvé et accessible, sans écraser les jobs existants |
| Option contrôle quotidien | Détection seule par cron sécurisé, selon l'infrastructure existante ; notification en cas de nouvelle version, aucune activation automatique |

Les secrets/token/webhook restent dans les cases grises masquées de la configuration principale. Les hashes de versions sont **des identifiants publics**, distincts des secrets ; gris en lecture seule signifie ici « non modifiable sans procédure contrôlée », pas « sensible ».

### 16.4. API interne (suggestion à adapter à l'auth et aux routes du dépôt)

- `GET /api/owner/integrations/replicate/versions` : statut actif / latest connu / historique local, aucun secret.
- `POST /api/owner/integrations/replicate/versions/check` : lire les métadonnées Replicate, calculer différences et enregistrer la candidate.
- `POST /api/owner/integrations/replicate/versions/validate` : tests statiques et mocks ; option `runPaidProbe=true` uniquement après confirmation d'une génération payante et dans les plafonds.
- `POST /api/owner/integrations/replicate/versions/activate` : transaction DB avec contrôle de concurrence (`expectedActiveVersion`, `candidateVersion`, statut `approved`, `schemaHash` inchangé) puis modification atomique du hash actif.
- `POST /api/owner/integrations/replicate/versions/rollback` : restaurer version antérieure qualifiée après vérification de sa disponibilité.

Toutes ces routes exigent **`OWNER` sur le serveur**, protection CSRF adaptée, validation Zod des hashes / états, journal d'audit expurgé et rate limiting. Ne jamais accepter d'URL libre ou de modèle hors liste approuvée. Un GET public ne doit pas énumérer les versions internes.

Pour les contrôles planifiés, réutiliser le scheduler/cron du dépôt s'il existe, sinon ajouter un cron Vercel / worker avec authentification machine et rythme quotidien configurable. Ne pas créer de boucle en mémoire dans une route Next.js serverless. La tâche planifiée ne doit jamais activer elle-même un nouveau hash.

### 16.5. Qualification avant activation — gates bloquants

1. **Préflight statique** : version réellement listée par Replicate, schéma obtenu, modèle exact, compatibilité de `prompt`, `lyrics`, `duration`, `audio_format`, options actuellement utilisées, absence de paramètres requis non pris en charge.
2. **Contrat MP3** : démontrer que la candidate accepte explicitement `audio_format: "mp3"`. Les tests unitaires doivent rejeter toute requête utilisateur contenant `mp4`, `wav`, `flac` ou une URL de sortie falsifiée.
3. **Tests mocks** : création d'une prédiction, parsing output string/tableau/objet selon schéma approuvé, événement webhook signé, stockage privé, téléchargement `audio/mpeg`, facturation/idempotence et annulation.
4. **Test réel payant en staging** : une courte génération MP3 seulement **avec validation explicite du propriétaire**, budget maximum et avertissement sur la facturation Replicate ; vérifier l'intégrité des octets audio (signature MP3, décodage et durée), le téléchargement et l'expiration des URLs temporaires. Sans test réel : laisser statut « non qualifiée pour production », n'activer pas.
5. **Vérification économique** : recalculer l'estimation coût GPU et les alertes ; ne pas modifier la grille de crédits MusikPro sans approbation métier. Vérifier les droits/licences et les éventuelles conditions nouvelles.
6. **Tests anti-régression** : Musicful, MusicGPT, crédits, comptes, paiement, création de chanson, web/desktop/PWA/Capacitor et anciennes générations Replicate doivent continuer de fonctionner.
7. **Promotion** : seul le propriétaire autorise la mise en production après staging ; transaction atomique, audit `actorId`, `previousVersion`, `newVersion`, `schemaHash`, `tests`, `time`.

### 16.6. Compatibilité et politique de mise à jour du skill

**Cas A : nouveau hash ACE-Step 1.5, contrat 100 % compatible**

- Aucun nouveau skill requis : le tableau de bord détecte → valide → teste → laisse le propriétaire activer. Les prédictions suivantes utilisent le hash actif lu en base. Le fichier SKILL.md reste à jour en tant que *contrat*, même si son hash initial sert seulement de valeur par défaut pour une installation neuve.

**Cas B : nouveau hash ACE-Step 1.5, paramètres ou sorties modifiés**

- Bloquer l'activation (`requires_code_review`). Modifier adaptateur TypeScript, validation Zod, tests, documentation/skill, puis déployer en staging et refaire les gates. Ne pas rendre le formulaire client automatiquement dépendant de champs non audités.

**Cas C : nouvelle famille ACE-Step 2.x, autre propriétaire de modèle, API ou format**

- Réaliser une revue complète de la documentation, du slug, de la licence, de la facturation, des signatures webhook et des sorties ; ajouter un adaptateur/versionnement explicite. Faire une nouvelle révision versionnée du skill et du code. Ne pas supposer qu'une nouvelle famille fournit du MP3 sans test.

**Cas D : dysfonctionnement après activation**

- Arrêter les **nouveaux** jobs sur la candidate ; revenir au hash antérieur approuvé (s'il est toujours disponible). Conserver `providerVersion` **immuable par job** : webhook et résultats des tâches déjà en cours restent traités selon leur version de départ, y compris pendant le rollback. Si l'ancienne version a été supprimée ou rendue indisponible, bloquer le fournisseur avec alerte explicite au lieu de forcer un hash inexistant.

### 16.7. Structure de données de suivi — à adapter, sans doublon

La table `AiProviderSetting` contient `modelVersion`, `previousModelVersion`, `candidateModelVersion`, `modelLastCheckedAt`, `modelLastPromotedAt`, `modelUpdateStatus`. Compléter le schéma réel par une **table d'audit append-only** des révisions (modèle, hash, empreinte schéma, testAt, résultat du probe, approbateur, date promotion, rollback, raison), liée au provider. Ne pas y stocker la clé API en clair, ni le MP3, ni les paroles.

Les **jobs** conservent `providerVersion` et un instantané des inputs validés ; le modèle appelé ne doit jamais être sélectionné à partir d'une préférence client non autorisée. Au moment du POST Replicate, figer une fois le hash actif à utiliser ; en cas de mise à jour pendant la génération, ne pas changer rétroactivement le hash du job.

### 16.8. Tests spécifiques mise à jour — non négociables

- Deux contrôles parallèles ne dupliquent ni les changements ni les tests payants.
- API versions indisponible : aucune mutation du modèle actif ; dernière détection marquée obsolète.
- Candidate identique au hash actif : aucun faux avis de nouvelle version.
- Nouveau champ requis inconnu : statut `requires_code_review`, aucune activation.
- MP3 supprimé du schéma / sortie changeant de nature : activation bloquée.
- Validation gratuite seule : `approved=false`, aucune promotion production.
- Probe réel échoué / non autorisé : conserver le hash actif et afficher le motif expurgé.
- Propriétaire non autorisé / usager ordinaire / CSRF incorrect : 401/403.
- Double clic Activer : transaction + contrôle version attendu ; pas de course.
- Bascule de version pendant job en cours : le job termine correctement avec son ancien hash.
- Retour arrière : pas de suppression des MP3 existants ni de double débit des crédits.
- Panne après promotion : rollback documenté + indicateur « État production » rouge tant que la nouvelle génération échoue.
- Aucune nouvelle version n'est activée automatiquement, même si l'option « vérifier quotidiennement » est cochée.

**Livrable Claude Code :** démontrer le flux `vérifier → comparer → tester → approuver → activer → rollback`, fournir migrations, tests, journaux d'audit expurgés et confirmation qu'aucune autre API musicale n'a été perturbée.
