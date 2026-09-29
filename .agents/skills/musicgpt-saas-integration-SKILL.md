---
name: musicgpt-saas-integration
description: >
  Intégrer proprement l'API MusicGPT dans un SaaS de génération musicale.
  Configure MusicGPT depuis le tableau de bord propriétaire, protège les secrets,
  génère des chansons via Music AI V2, gère les deux variantes, webhooks, voix,
  Remix/Inpaint/Extend/Sing Over Instrumental et normalise toutes les sorties
  finales en MP3 uniquement.
version: 1.0.0
language: fr
last_verified: 2026-09-29
official_site: https://musicgpt.com/
official_docs: https://docs.musicgpt.com/
---

# Skill — MusicGPT SaaS Integration

## 1. Mission

Ce skill doit permettre à un agent de développement de connecter **MusicGPT** à un SaaS de génération musicale de façon propre, sécurisée et maintenable.

L'intégration doit permettre :

- de saisir et gérer l'API MusicGPT depuis le **tableau de bord propriétaire du SaaS** ;
- de ne jamais exposer la clé API au navigateur ou aux utilisateurs finaux ;
- de générer de la musique directement depuis le SaaS ;
- de conserver **uniquement les fichiers audio MP3** comme résultat final ;
- de prendre en compte les paramètres déjà présents dans le SaaS : style, genre, ambiance, occasion, paroles, langue, voix, sexe vocal, instrumentation, tempo, structure, titre, mode instrumental, etc. ;
- d'utiliser Music AI V2 pour toute nouvelle génération ;
- de supporter les modèles `v6`, `v6-pro`, `v7` et `v7-pro` ;
- de récupérer les deux versions générées par MusicGPT ;
- d'utiliser les webhooks en priorité ;
- de proposer les fonctions musicales avancées pertinentes : voix, remix, inpainting, extension, chant sur instrumental, génération de paroles et image-to-song ;
- de respecter les limites de débit MusicGPT ;
- de journaliser les générations sans journaliser les secrets ;
- de préserver toutes les fonctionnalités existantes du projet.

Ce skill doit travailler comme une **refactorisation professionnelle** : modifications minimales, architecture claire, aucune régression, validations côté client et côté serveur, et tests d'intégrité après chaque modification importante.

---

# 2. Règles non négociables

## 2.1 Music AI V2 pour la génération principale

Pour toute nouvelle génération de chanson, utiliser :

```http
POST https://api.musicgpt.com/api/public/v2/MusicAI
```

Ne pas construire une nouvelle intégration autour de Music AI V1.

L'API V1 peut rester utilisée uniquement pour les fonctions qui n'ont pas encore d'équivalent V2 documenté, par exemple certaines fonctions comme Remix, Inpaint, Extend ou les utilitaires de voix.

---

## 2.2 MP3 uniquement

Le SaaS doit considérer le **MP3 comme le seul format final autorisé**.

MusicGPT peut renvoyer notamment :

- `conversion_path` → MP3
- `conversion_path_wav` → WAV
- éventuellement `streaming_url` sur certains modèles Pro

Règles :

1. conserver et publier `conversion_path` ;
2. ignorer `conversion_path_wav` ;
3. ne jamais proposer WAV dans l'interface utilisateur ;
4. ne jamais enregistrer le WAV comme fichier final ;
5. ne jamais afficher un bouton de téléchargement WAV ;
6. si un flux HLS est utilisé pour un aperçu temporaire, il ne remplace jamais le MP3 final ;
7. stocker le MP3 final dans le stockage propre du SaaS lorsque c'est possible ;
8. ne pas dépendre durablement d'une URL signée temporaire MusicGPT.

Schéma interne recommandé :

```ts
type MusicAsset = {
  provider: "musicgpt";
  format: "mp3";
  url: string;
  duration?: number;
  title?: string;
  coverUrl?: string;
  lyrics?: string;
  lyricsTimestamps?: unknown;
};
```

Aucune autre valeur de `format` ne doit être acceptée pour le résultat final MusicGPT.

---

# 3. Architecture recommandée

```text
Utilisateur
   │
   ▼
Interface SaaS
   │
   │  paramètres de génération
   ▼
API serveur du SaaS
   │
   ├── validation Zod
   ├── vérification authentification/quota
   ├── construction du prompt MusicGPT
   ├── déchiffrement de la clé MusicGPT
   └── création du job interne
          │
          ▼
MusicGPT API
          │
          ├── task_id
          ├── conversion_id_1
          ├── conversion_id_2
          └── credit_estimate
          │
          ▼
Webhook HTTPS du SaaS
          │
          ├── validation
          ├── idempotence
          ├── récupération MP3
          ├── copie vers stockage SaaS
          └── mise à jour de la génération
          │
          ▼
Bibliothèque musicale du SaaS
```

Ne jamais appeler MusicGPT directement depuis React, le navigateur, une application mobile cliente ou du JavaScript public.

---

# 4. Configuration dans le tableau de bord propriétaire

Créer une rubrique :

```text
Tableau de bord propriétaire
└── Intégrations
    └── MusicGPT
```

## 4.1 Champs recommandés

| Champ | Type | Sensible | Valeur / comportement |
|---|---|---:|---|
| Activer MusicGPT | switch | Non | Active/désactive le fournisseur |
| Clé API MusicGPT | password | Oui | Stockée chiffrée côté serveur |
| État de connexion | badge | Non | Connecté / erreur / non configuré |
| API Base URL | texte readonly | Non | `https://api.musicgpt.com/api/public` |
| Version génération | readonly | Non | `v2` |
| Modèle par défaut | select | Non | `v6`, `v6-pro`, `v7`, `v7-pro` |
| Modèle économique | select optionnel | Non | généralement `v6` |
| Modèle haute qualité | select optionnel | Non | généralement `v7` ou `v7-pro` |
| Genre vocal par défaut | select | Non | male / female / neutral |
| Voix par défaut | select/recherche | Non | `voice_id` MusicGPT |
| Générer couverture | switch | Non | `generate_album_cover` |
| Timestamps paroles | switch | Non | `lyrics_timestamps` |
| Webhook actif | switch | Non | recommandé : activé |
| Jeton webhook | secret | Oui | généré côté serveur |
| Format final | readonly | Non | `MP3 uniquement` |
| Concurrence maximale | nombre | Non | selon le plan MusicGPT |
| Stockage local/CDN | switch | Non | recommandé : activé |
| Timeout génération | nombre | Non | limite interne du SaaS |
| Mode debug | switch | Non | interdit d'imprimer les secrets |

---

# 5. Apparence des informations sensibles

Toutes les informations sensibles doivent être **grisées visuellement**.

Important : grisée ne veut pas dire désactivée lorsqu'il faut permettre la saisie.

Exemple Tailwind :

```tsx
const sensitiveFieldClass =
  "bg-zinc-100 dark:bg-zinc-900 " +
  "border-zinc-300 dark:border-zinc-700 " +
  "text-zinc-700 dark:text-zinc-200 " +
  "font-mono";
```

Exemple API key :

```tsx
<input
  type="password"
  autoComplete="new-password"
  className={sensitiveFieldClass}
  placeholder={hasApiKey ? "••••••••••••••••" : "musicgpt_api_key"}
/>
```

Après sauvegarde :

- ne jamais renvoyer la clé API complète au frontend ;
- retourner uniquement `hasApiKey: true` et éventuellement les 4 derniers caractères ;
- ne jamais permettre un bouton « afficher la clé enregistrée » ;
- proposer « Remplacer la clé » ;
- conserver l'ancienne clé si le champ de remplacement est laissé vide.

Exemple réponse serveur :

```json
{
  "enabled": true,
  "hasApiKey": true,
  "apiKeyLast4": "7XQ2",
  "defaultModel": "v7",
  "finalFormat": "mp3"
}
```

---

# 6. Stockage sécurisé de la clé API

La clé saisie dans le dashboard doit être enregistrée chiffrée.

Ne jamais utiliser :

- `localStorage` ;
- `sessionStorage` ;
- cookies lisibles par JavaScript ;
- table SQL en clair ;
- variable injectée dans le bundle frontend ;
- log serveur ;
- erreur Sentry contenant la clé ;
- paramètres d'URL.

Utiliser :

- KMS du fournisseur cloud, ou
- chiffrement applicatif **AES-256-GCM** côté serveur.

La clé de chiffrement de l'application doit rester dans une variable d'environnement :

```env
INTEGRATION_ENCRYPTION_KEY=...
```

Cette clé de chiffrement ne doit **jamais** être administrable depuis le dashboard.

---

# 7. Schéma de données recommandé

Adapter les noms au schéma existant. Ne pas recréer inutilement des tables déjà disponibles.

Exemple Prisma :

```prisma
model MusicGptConfig {
  id                    String   @id @default(cuid())
  enabled               Boolean  @default(false)

  apiKeyCiphertext      String?
  apiKeyIv              String?
  apiKeyAuthTag         String?
  apiKeyLast4           String?

  defaultModel          String   @default("v7")
  defaultGender         String?  @default("neutral")
  defaultVoiceId        String?

  generateAlbumCover    Boolean  @default(true)
  lyricsTimestamps      Boolean  @default(true)

  webhookTokenHash      String?
  maxParallelJobs       Int      @default(1)

  finalFormat           String   @default("mp3")
  copyToOwnStorage      Boolean  @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

Générations :

```prisma
model MusicGeneration {
  id                    String   @id @default(cuid())
  userId                String?

  provider              String   @default("musicgpt")
  status                String   @default("QUEUED")

  taskId                String?
  conversionId1         String?
  conversionId2         String?

  requestedModel        String?
  effectiveModel        String?

  promptSnapshot        String?
  musicStyleSnapshot    String?
  lyricsSnapshot        String?

  creditEstimate        Float?

  variant1Mp3Url        String?
  variant2Mp3Url        String?

  variant1ProviderUrl   String?
  variant2ProviderUrl   String?

  variant1Duration      Float?
  variant2Duration      Float?

  coverUrl1             String?
  coverUrl2             String?

  providerPayloadJson   Json?
  errorCode             String?
  errorMessage          String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([taskId])
  @@index([conversionId1])
  @@index([conversionId2])
  @@index([status])
}
```

Si une table de générations existe déjà, l'étendre plutôt que la dupliquer.

---

# 8. Modèles MusicGPT

Les modèles actuellement documentés pour Music AI V2 sont :

```ts
type MusicGptModel =
  | "v6"
  | "v6-pro"
  | "v7"
  | "v7-pro";
```

Comportement recommandé :

- `v6` : option économique/rapide ;
- `v6-pro` : famille v6 avec capacités Pro/streaming ;
- `v7` : qualité supérieure ;
- `v7-pro` : modèle haut de gamme avec capacités Pro.

Pour un SaaS **MP3 uniquement**, le réglage par défaut recommandé dans ce skill est :

```ts
defaultModel = "v7";
```

Le propriétaire peut choisir un autre modèle dans le dashboard.

## Règle MusicGPT importante

Si :

```ts
voice_id !== undefined
```

ou :

```ts
vocal_only === true
```

MusicGPT indique que la génération utilise actuellement `v6`, même si une autre valeur de `model` a été demandée.

Le SaaS doit donc afficher le **modèle effectif** :

```ts
const effectiveModel =
  input.voiceId || input.vocalOnly
    ? "v6"
    : input.model;
```

Ne pas afficher à l'utilisateur qu'une génération utilise v7 si MusicGPT la traite finalement avec v6.

---

# 9. Paramètres Music AI V2 à supporter

Corps actuel documenté pour `POST /v2/MusicAI` :

```ts
type MusicAiV2Request = {
  prompt?: string;
  title?: string;
  music_style?: string;
  lyrics?: string;

  make_instrumental?: boolean;
  vocal_only?: boolean;

  voice_id?: string;

  generate_album_cover?: boolean;
  lyrics_timestamps?: boolean;

  model?: "v6" | "v6-pro" | "v7" | "v7-pro";
  webhook_url?: string;

  gender?: "male" | "female" | "neutral";
};
```

Ne pas envoyer de paramètre non documenté sans vérification préalable de la documentation officielle.

En particulier, au moment de la dernière vérification de ce skill, `output_length` ne figure pas dans la liste canonique actuelle des paramètres Music AI V2.

Si le SaaS possède un champ « durée souhaitée », l'intégrer dans le prompt comme indication tant qu'un champ natif de durée n'est pas officiellement documenté.

---

# 10. Modes de génération

## 10.1 Prompt mode

L'utilisateur donne une idée et MusicGPT construit la chanson.

Exemple :

```json
{
  "prompt": "Zouglou ivoirien festif, percussions organiques, guitare rythmique, chœurs énergiques, thème de persévérance",
  "title": "Toujours Debout",
  "music_style": "Zouglou",
  "model": "v7",
  "gender": "male",
  "generate_album_cover": true,
  "lyrics_timestamps": true
}
```

## 10.2 Custom mode

L'utilisateur fournit ses propres paroles.

```json
{
  "prompt": "Zouglou ivoirien chaleureux, tempo moyen, guitare rythmique, percussions dansantes, refrain collectif",
  "title": "Toujours Debout",
  "music_style": "Zouglou",
  "lyrics": "[Intro]\n...\n[Verse]\n...\n[Chorus]\n...",
  "model": "v7",
  "gender": "male"
}
```

Dans ce mode :

- conserver les paroles fournies ;
- ne pas demander à MusicGPT de réécrire les paroles sauf si l'utilisateur l'a explicitement choisi ;
- le prompt décrit surtout la réalisation musicale.

---

# 11. Construction du prompt depuis les paramètres existants du SaaS

Le formulaire existant du SaaS est la **source de vérité produit**.

Avant d'ajouter MusicGPT :

1. inspecter le schéma du formulaire existant ;
2. lister tous les champs utilisés pour générer une chanson ;
3. préserver tous ces champs ;
4. mapper chaque champ vers :
   - un champ natif MusicGPT, ou
   - le `prompt`, ou
   - `music_style`, ou
   - `lyrics`.

Ne jamais supprimer silencieusement un paramètre métier parce que MusicGPT n'a pas de champ dédié.

Exemples de paramètres possibles du SaaS :

```ts
type ExistingSongForm = {
  title?: string;

  genre?: string;
  subgenre?: string;
  style?: string;
  mood?: string;
  occasion?: string;

  language?: string;
  countryInfluence?: string;

  tempo?: string;
  bpm?: number;
  key?: string;

  instruments?: string[];
  vocalStyle?: string;
  vocalGender?: "male" | "female" | "neutral";

  theme?: string;
  story?: string;
  audience?: string;

  structure?: string[];
  durationHint?: string;

  lyrics?: string;

  instrumental?: boolean;
  vocalOnly?: boolean;

  voiceId?: string;

  energy?: string;
  productionStyle?: string;

  additionalInstructions?: string;
};
```

Le skill ne doit pas imposer cette liste au projet. Il doit **détecter et respecter les champs réels du SaaS**.

---

# 12. Prompt builder recommandé

```ts
function buildMusicGptPrompt(input: ExistingSongForm): string {
  const parts: string[] = [];

  if (input.genre) parts.push(`Genre: ${input.genre}`);
  if (input.subgenre) parts.push(`Sous-genre: ${input.subgenre}`);
  if (input.style) parts.push(`Style: ${input.style}`);
  if (input.mood) parts.push(`Ambiance: ${input.mood}`);
  if (input.occasion) parts.push(`Occasion: ${input.occasion}`);

  if (input.language) parts.push(`Langue: ${input.language}`);
  if (input.countryInfluence) {
    parts.push(`Influence culturelle: ${input.countryInfluence}`);
  }

  if (input.tempo) parts.push(`Tempo: ${input.tempo}`);
  if (input.bpm) parts.push(`BPM souhaité: ${input.bpm}`);
  if (input.key) parts.push(`Tonalité souhaitée: ${input.key}`);

  if (input.instruments?.length) {
    parts.push(`Instruments: ${input.instruments.join(", ")}`);
  }

  if (input.vocalStyle) {
    parts.push(`Style vocal: ${input.vocalStyle}`);
  }

  if (input.theme) parts.push(`Thème: ${input.theme}`);
  if (input.story) parts.push(`Contexte narratif: ${input.story}`);
  if (input.audience) parts.push(`Public: ${input.audience}`);

  if (input.structure?.length) {
    parts.push(`Structure: ${input.structure.join(" > ")}`);
  }

  if (input.durationHint) {
    parts.push(`Durée souhaitée approximative: ${input.durationHint}`);
  }

  if (input.energy) parts.push(`Énergie: ${input.energy}`);
  if (input.productionStyle) {
    parts.push(`Production: ${input.productionStyle}`);
  }

  if (input.additionalInstructions) {
    parts.push(input.additionalInstructions);
  }

  return normalizeMusicGptPrompt(parts.join(". "));
}
```

La fonction `normalizeMusicGptPrompt` doit :

- supprimer les espaces inutiles ;
- appliquer les limites ;
- refuser les valeurs manifestement invalides ;
- ne jamais injecter de clés secrètes ;
- empêcher les références à des artistes lorsque les règles MusicGPT l'interdisent.

---

# 13. Limites de prompt et paroles

Appliquer côté client **et** côté serveur :

```ts
const MUSICGPT_MAX_PROMPT_CHARS = 1000;
const MUSICGPT_MAX_LYRICS_CHARS = 5000;
```

Les paroles peuvent utiliser des balises de structure comme :

```text
[Intro]
[Verse]
[Pre-Chorus]
[Chorus]
[Bridge]
[Outro]
```

Ne pas mettre de nom d'artiste dans :

- le prompt ;
- les paroles ;
- les instructions de style envoyées à MusicGPT.

Le SaaS peut demander un style descriptif :

```text
Afro-pop ivoirienne énergique, batterie moderne, guitare dansante,
chœurs de groupe, refrain très mémorisable
```

mais pas :

```text
Fais exactement comme [nom d'artiste]
```

---

# 14. Validation Zod recommandée

```ts
import { z } from "zod";

export const musicGptGenerationSchema = z
  .object({
    title: z.string().trim().max(200).optional(),

    prompt: z.string().trim().max(1000).optional(),
    musicStyle: z.string().trim().max(300).optional(),
    lyrics: z.string().max(5000).optional(),

    makeInstrumental: z.boolean().default(false),
    vocalOnly: z.boolean().default(false),

    voiceId: z.string().trim().max(200).optional(),

    gender: z
      .enum(["male", "female", "neutral"])
      .optional(),

    model: z
      .enum(["v6", "v6-pro", "v7", "v7-pro"])
      .default("v7"),

    generateAlbumCover: z.boolean().default(true),
    lyricsTimestamps: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.makeInstrumental && data.vocalOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vocalOnly"],
        message:
          "Une génération ne peut pas être à la fois instrumental-only et vocal-only.",
      });
    }

    if (!data.prompt && !data.lyrics) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prompt"],
        message:
          "Un prompt ou des paroles sont nécessaires.",
      });
    }
  });
```

Ajouter les validations correspondant au schéma réel du SaaS.

---

# 15. Client MusicGPT côté serveur

Créer un seul adaptateur fournisseur.

Exemple :

```ts
const MUSICGPT_BASE_URL =
  "https://api.musicgpt.com/api/public";

export class MusicGptClient {
  constructor(private readonly apiKey: string) {}

  private async request(
    path: string,
    init: RequestInit = {},
  ) {
    const response = await fetch(
      `${MUSICGPT_BASE_URL}${path}`,
      {
        ...init,
        headers: {
          Authorization: this.apiKey,
          ...(init.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...init.headers,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const body = await safeReadProviderError(response);
      throw mapMusicGptError(response.status, body);
    }

    return response.json();
  }

  async generateMusic(
    payload: MusicAiV2Request,
  ) {
    return this.request("/v2/MusicAI", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getById(params: {
    taskId?: string;
    conversionId?: string;
  }) {
    const qs = new URLSearchParams();

    if (params.taskId) {
      qs.set("task_id", params.taskId);
    }

    if (params.conversionId) {
      qs.set("conversion_id", params.conversionId);
    }

    return this.request(`/v1/byId?${qs.toString()}`);
  }

  async getVoices(
    page = 0,
    limit = 20,
  ) {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return this.request(
      `/v1/getAllVoices?${qs.toString()}`,
    );
  }

  async searchVoices(
    query: string,
    page = 0,
    limit = 20,
  ) {
    const qs = new URLSearchParams({
      query,
      page: String(page),
      limit: String(limit),
    });

    return this.request(
      `/v1/searchVoices?${qs.toString()}`,
    );
  }
}
```

Ne créer aucune fonction cliente qui reçoit la clé API dans le navigateur.

---

# 16. Création d'une génération

Exemple service serveur :

```ts
async function createMusicGptGeneration(
  userId: string,
  input: ExistingSongForm,
) {
  const config = await loadMusicGptConfig();

  if (!config.enabled) {
    throw new Error("MusicGPT est désactivé.");
  }

  const apiKey = decryptMusicGptApiKey(config);

  const client = new MusicGptClient(apiKey);

  const prompt = buildMusicGptPrompt(input);

  const requestedModel =
    config.defaultModel as MusicGptModel;

  const effectiveModel =
    input.voiceId || input.vocalOnly
      ? "v6"
      : requestedModel;

  const webhookUrl =
    await buildMusicGptWebhookUrl();

  const payload: MusicAiV2Request = {
    prompt,
    title: input.title,
    music_style:
      input.style ||
      input.subgenre ||
      input.genre,

    lyrics: input.lyrics || "",

    make_instrumental:
      Boolean(input.instrumental),

    vocal_only:
      Boolean(input.vocalOnly),

    voice_id:
      input.voiceId ||
      config.defaultVoiceId ||
      undefined,

    gender:
      input.vocalGender ||
      config.defaultGender ||
      undefined,

    generate_album_cover:
      config.generateAlbumCover,

    lyrics_timestamps:
      config.lyricsTimestamps,

    model: effectiveModel,

    webhook_url: webhookUrl,
  };

  const upstream =
    await client.generateMusic(payload);

  const generation =
    await db.musicGeneration.create({
      data: {
        userId,
        provider: "musicgpt",
        status: "PROCESSING",

        taskId: upstream.task_id,
        conversionId1:
          upstream.conversion_id_1,
        conversionId2:
          upstream.conversion_id_2,

        requestedModel,
        effectiveModel,

        promptSnapshot: prompt,
        musicStyleSnapshot:
          payload.music_style,
        lyricsSnapshot:
          payload.lyrics,

        creditEstimate:
          upstream.credit_estimate ?? null,

        providerPayloadJson:
          sanitizeProviderPayload(upstream),
      },
    });

  return {
    id: generation.id,
    status: generation.status,
    taskId: upstream.task_id,
    eta: upstream.eta,
    variants: 2,
    creditEstimate:
      upstream.credit_estimate ?? null,
  };
}
```

---

# 17. Deux variantes par génération

Music AI V2 renvoie actuellement deux `conversion_id`.

Le SaaS doit les traiter comme :

```text
Version A
Version B
```

et non comme deux générations indépendantes déclenchées par le SaaS.

Stocker séparément :

```ts
conversionId1
conversionId2
variant1Mp3Url
variant2Mp3Url
```

Dans l'interface :

- afficher les deux lecteurs audio ;
- permettre à l'utilisateur de choisir sa version préférée ;
- proposer le téléchargement MP3 pour chacune ;
- ne jamais afficher le WAV.

---

# 18. Webhook MusicGPT

Le webhook doit être la méthode principale de récupération.

URL recommandée :

```text
https://ton-saas.com/api/webhooks/musicgpt/<jeton-aleatoire>
```

MusicGPT exige un endpoint HTTPS.

Le jeton doit :

- être généré côté serveur ;
- avoir une forte entropie ;
- être stocké sous forme de hash si possible ;
- ne jamais apparaître dans l'interface utilisateur ;
- être régénérable depuis le dashboard propriétaire ;
- être expurgé des logs HTTP.

Au moment de la vérification de cette documentation, ne pas supposer qu'une signature HMAC MusicGPT existe si elle n'est pas documentée.

Sécuriser donc le webhook avec :

1. HTTPS ;
2. URL difficile à deviner ;
3. validation du schéma ;
4. vérification que `task_id` ou `conversion_id` existe déjà dans la base ;
5. idempotence ;
6. limite de taille du payload ;
7. rate limiting raisonnable ;
8. rejet des événements sans correspondance ;
9. logs sans secret.

---

# 19. Traitement MP3 du webhook

MusicGPT peut fournir notamment :

```json
{
  "conversion_path": "https://.../audio.mp3",
  "conversion_path_wav": "https://.../audio.wav"
}
```

Toujours faire :

```ts
const mp3Url =
  payload.conversion_path ||
  payload.audio_url;

if (!mp3Url) {
  throw new Error(
    "MusicGPT n'a renvoyé aucun MP3."
  );
}
```

Toujours ignorer :

```ts
payload.conversion_path_wav
```

Ne pas l'enregistrer comme résultat utilisateur.

---

# 20. Copier immédiatement le MP3 dans le stockage du SaaS

Certaines URL MusicGPT peuvent être temporaires/signées.

La documentation indique que certaines URLs signées peuvent expirer.

Le système doit donc, après succès :

1. valider l'URL ;
2. vérifier `https:` ;
3. bloquer les adresses IP privées/localhost ;
4. télécharger côté serveur ;
5. vérifier la réponse HTTP ;
6. vérifier le type MIME ;
7. appliquer une limite de taille ;
8. stocker le MP3 dans le stockage propre du SaaS ;
9. enregistrer l'URL permanente interne ;
10. ne plus dépendre de l'URL temporaire pour la lecture utilisateur.

Exemple :

```ts
async function ingestMusicGptMp3(
  providerUrl: string,
  destinationKey: string,
) {
  const url = new URL(providerUrl);

  assertHttps(url);
  assertNoPrivateNetworkTarget(url);

  const response = await fetch(url, {
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      "Impossible de récupérer le MP3 MusicGPT."
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  const pathnameIsMp3 =
    url.pathname.toLowerCase().endsWith(".mp3");

  const mimeIsMp3 =
    contentType.includes("audio/mpeg") ||
    contentType.includes("audio/mp3");

  if (!pathnameIsMp3 && !mimeIsMp3) {
    throw new Error(
      "La ressource MusicGPT n'est pas un MP3."
    );
  }

  assertSafeContentLength(response);

  const data = await response.arrayBuffer();

  return uploadMp3ToOwnStorage({
    key: destinationKey,
    body: Buffer.from(data),
    contentType: "audio/mpeg",
  });
}
```

L'implémentation de `uploadMp3ToOwnStorage` doit réutiliser le système de stockage déjà présent dans le SaaS.

---

# 21. Webhook idempotent

MusicGPT peut réessayer un webhook.

Ne jamais créer un nouveau morceau à chaque réception identique.

Utiliser :

```text
provider + task_id + conversion_id
```

comme clé logique.

Exemple :

```ts
const existing =
  await findGenerationVariant(
    conversionId,
  );

if (existing?.status === "COMPLETED") {
  return new Response("ok", {
    status: 200,
  });
}
```

Une répétition doit produire le même état final, sans double facturation interne ni double fichier.

---

# 22. Polling de secours

Si le webhook échoue ou n'est pas disponible :

```http
GET https://api.musicgpt.com/api/public/v1/byId
```

avec `task_id` ou `conversion_id`.

Le polling est une solution de secours, pas la stratégie principale.

Recommandation :

- backoff progressif ;
- arrêter dès que le job est terminé ;
- ne pas dépasser les limites du plan ;
- ne jamais lancer un polling illimité depuis le navigateur.

---

# 23. Limites de concurrence

Les limites documentées pour les générations audio dépendent du plan MusicGPT.

Au moment de la dernière vérification :

```text
Free : 1 génération parallèle
Plus : 3 générations parallèles
Pro  : 10 générations parallèles
```

Pour `Get by ID` :

```text
Free : 20 appels/min
Plus : 200 appels/min
Pro  : 500 appels/min
```

Le SaaS doit donc utiliser une file d'attente.

Exemple logique :

```ts
if (
  activeMusicGptJobs >=
  config.maxParallelJobs
) {
  queueJob();
} else {
  startJob();
}
```

Valeur par défaut sûre :

```text
maxParallelJobs = 1
```

Le propriétaire peut l'augmenter selon son abonnement réel MusicGPT.

---

# 24. Gestion des crédits

La réponse Music AI V2 peut fournir :

```json
{
  "credit_estimate": 0
}
```

Le SaaS doit :

- enregistrer `credit_estimate` ;
- l'afficher au propriétaire si utile ;
- ne pas hardcoder durablement des tarifs dans le code ;
- garder les prix commerciaux séparés du client API ;
- traiter une erreur de crédits insuffisants comme un incident de configuration/facturation propriétaire.

Ne pas inventer un prix si MusicGPT change ses tarifs.

---

# 25. Gestion des erreurs

Mapper les erreurs fournisseur vers des erreurs internes stables.

Exemple :

```ts
type MusicProviderErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "CONTENT_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "UNKNOWN";
```

Exemple mapping :

```ts
function mapMusicGptError(
  status: number,
  body: unknown,
) {
  switch (status) {
    case 400:
      return appError(
        "BAD_REQUEST",
        "Paramètres MusicGPT invalides.",
      );

    case 401:
      return appError(
        "UNAUTHORIZED",
        "Clé API MusicGPT invalide.",
      );

    case 402:
      return appError(
        "INSUFFICIENT_CREDITS",
        "Crédits MusicGPT insuffisants.",
      );

    case 429:
      return appError(
        "RATE_LIMITED",
        "Limite MusicGPT atteinte.",
      );

    default:
      if (status >= 500) {
        return appError(
          "PROVIDER_UNAVAILABLE",
          "MusicGPT est temporairement indisponible.",
        );
      }

      return appError(
        "UNKNOWN",
        "Erreur MusicGPT.",
      );
  }
}
```

Ne pas renvoyer le body fournisseur complet aux utilisateurs finaux.

---

# 26. États internes

Utiliser des états simples :

```ts
type MusicGenerationStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED";
```

Ne pas utiliser directement les textes MusicGPT comme état métier.

---

# 27. Gestion des voix

Endpoints disponibles :

```http
GET /api/public/v1/getAllVoices
GET /api/public/v1/searchVoices
```

Le dashboard ou le formulaire peut proposer :

- recherche d'une voix ;
- pagination ;
- sélection `voice_id` ;
- aperçu si l'API ou l'interface le permet.

Le SaaS doit stocker uniquement :

```ts
{
  voiceId: string;
  voiceName?: string;
}
```

Ne jamais considérer le nom comme identifiant stable.

Rappel : lorsqu'un `voice_id` est envoyé à Music AI V2, le modèle effectif est actuellement `v6`.

---

# 28. Feature registry MusicGPT

Éviter un gros service monolithique.

Créer un registre :

```ts
type MusicGptCapability =
  | "generate"
  | "remix"
  | "inpaint"
  | "extend"
  | "sing-over-instrumental"
  | "lyrics-generator"
  | "image-to-song"
  | "voices";
```

Exemple :

```ts
export const MUSICGPT_CAPABILITIES = {
  generate: {
    method: "POST",
    path: "/v2/MusicAI",
  },

  remix: {
    method: "POST",
    path: "/v1/Remix",
  },

  inpaint: {
    method: "POST",
    path: "/v1/inpaint",
  },

  extend: {
    method: "POST",
    path: "/v1/extend",
  },

  singOverInstrumental: {
    method: "POST",
    path: "/v1/sing_over_instrumental",
  },

  lyrics: {
    method: "GET",
    path: "/v1/prompt_to_lyrics",
  },

  imageToSong: {
    method: "POST",
    path: "/v1/image_to_song",
  },

  voices: {
    method: "GET",
    path: "/v1/getAllVoices",
  },
} as const;
```

Chaque capability doit normaliser son résultat vers le même format interne MP3.

---

# 29. Remix

Endpoint :

```http
POST https://api.musicgpt.com/api/public/v1/Remix
```

Cette fonction peut accepter une entrée audio et des instructions de remix.

Champs documentés pertinents :

- `prompt`
- `lyrics`
- `gender`
- `title`
- `generate_album_cover`
- `lyrics_timestamp`
- `webhook_url`
- `audio_url` ou `audio_file`

Pour le SaaS :

- accepter un MP3 utilisateur ;
- valider le fichier ;
- envoyer côté serveur ;
- récupérer le résultat ;
- normaliser en MP3 ;
- supprimer les fichiers temporaires selon la politique de conservation.

---

# 30. Inpaint

Endpoint :

```http
POST https://api.musicgpt.com/api/public/v1/inpaint
```

Utilité :

- remplacer une partie d'un morceau ;
- remplacer une section de paroles ;
- modifier une plage temporelle.

Paramètres pertinents :

- `prompt`
- `replace_start_at`
- `replace_end_at`
- `lyrics`
- `lyrics_section_to_replace`
- `gender`
- `num_outputs`
- `title`
- `generate_album_cover`
- `lyrics_timestamps`
- `webhook_url`
- `audio_url` ou `audio_file`

Valider obligatoirement :

```text
replace_start_at < replace_end_at
```

et que les bornes restent dans la durée du fichier.

---

# 31. Extend

Endpoint :

```http
POST https://api.musicgpt.com/api/public/v1/extend
```

Paramètres pertinents :

- `extend_after`
- `prompt`
- `lyrics`
- `gender`
- `lyrics_section_to_extend`
- `num_outputs`
- `title`
- `generate_album_cover`
- `lyrics_timestamps`
- `webhook_url`
- `audio_url` ou `audio_file`

Toujours normaliser la sortie finale en MP3.

---

# 32. Sing Over Instrumental

Endpoint :

```http
POST https://api.musicgpt.com/api/public/v1/sing_over_instrumental
```

Permet d'ajouter un chant à une piste instrumentale.

Paramètres pertinents :

- `prompt`
- `lyrics`
- `gender`
- `title`
- `generate_album_cover`
- `lyrics_timestamps`
- `webhook_url`
- `audio_url` ou `audio_file`

Cette fonction doit rester séparée de `vocal_only`.

---

# 33. Lyrics Generator

Endpoint documenté :

```http
GET https://api.musicgpt.com/api/public/v1/prompt_to_lyrics
```

L'intégrer comme fonction facultative.

Règle :

- si le SaaS possède déjà son propre générateur de paroles via OpenAI/Claude/Grok, ne pas le remplacer automatiquement ;
- proposer MusicGPT Lyrics Generator comme fournisseur supplémentaire ;
- préserver l'architecture multi-provider existante.

---

# 34. Image to Song

Endpoint :

```http
POST https://api.musicgpt.com/api/public/v1/image_to_song
```

Peut être exposé comme fonctionnalité facultative.

Paramètres documentés pertinents :

- `image_url`
- `prompt`
- `lyrics`
- mode instrumental/vocal
- `key`
- `bpm`
- `webhook_url`
- `voice_id`

Même règle : sortie finale MP3 uniquement.

---

# 35. Autres fonctions MusicGPT

La documentation MusicGPT expose également de nombreuses fonctions audio, notamment :

- Music AI ;
- Remix ;
- Inpaint ;
- Extend ;
- TTS ;
- Sound Generator ;
- Extraction ;
- Voice Changer ;
- Sing Over Instrumental ;
- Lyrics Generator ;
- Audio to MIDI ;
- Audio Cutter ;
- Speed Changer ;
- Transcribe ;
- Cover Song ;
- Deecho ;
- Denoise ;
- Dereverb ;
- Key & BPM ;
- File Conversion ;
- Audio Mastering ;
- Image to Song.

Pour ce SaaS de génération de musique, ne pas tout activer automatiquement.

Priorité :

1. Generate ;
2. Voices ;
3. Remix ;
4. Extend ;
5. Inpaint ;
6. Sing Over Instrumental ;
7. Lyrics Generator ;
8. Image to Song.

Ajouter les autres capacités via des adaptateurs séparés uniquement si elles correspondent au produit.

---

# 36. Route de configuration propriétaire

Routes recommandées :

```text
GET  /api/owner/integrations/musicgpt
PUT  /api/owner/integrations/musicgpt
POST /api/owner/integrations/musicgpt/test
POST /api/owner/integrations/musicgpt/rotate-webhook
```

Exigences :

- propriétaire/super-admin uniquement ;
- contrôle d'autorisation côté serveur ;
- CSRF selon l'architecture d'authentification ;
- validation Zod ;
- audit log ;
- aucun secret dans la réponse.

---

# 37. Test de connexion

Le bouton :

```text
Tester la connexion
```

doit tester la clé **côté serveur**.

Une option légère consiste à demander une petite page de voix :

```http
GET /api/public/v1/getAllVoices?limit=1&page=0
Authorization: <api-key>
```

Résultats UI :

```text
● Connecté
● Clé invalide
● Configuration absente
● MusicGPT indisponible
```

Ne pas afficher :

```text
Authorization: abcdef...
```

même en mode debug.

---

# 38. Routes utilisateur recommandées

```text
POST /api/music/generate
GET  /api/music/generations/:id
GET  /api/music/voices
GET  /api/music/voices/search
POST /api/music/remix
POST /api/music/inpaint
POST /api/music/extend
POST /api/music/sing-over-instrumental
POST /api/music/image-to-song
```

Webhook :

```text
POST /api/webhooks/musicgpt/:token
```

Réutiliser les conventions de routes déjà présentes dans le SaaS.

---

# 39. Contrôle d'accès

Séparer clairement :

## Propriétaire

Peut :

- saisir/remplacer la clé ;
- choisir le modèle par défaut ;
- choisir les paramètres MusicGPT globaux ;
- tester l'intégration ;
- désactiver le fournisseur ;
- consulter les erreurs de crédits ;
- consulter les métriques.

## Utilisateur du SaaS

Peut :

- générer une chanson ;
- choisir les paramètres autorisés par le produit ;
- écouter/télécharger son MP3 ;
- voir ses propres générations.

Ne peut jamais :

- lire la clé MusicGPT ;
- modifier le webhook secret ;
- changer les limites globales ;
- voir les générations d'un autre tenant/utilisateur.

---

# 40. Multi-tenant

Si le SaaS est multi-tenant, décider explicitement si :

```text
A. Une seule clé MusicGPT appartient au propriétaire du SaaS
```

ou :

```text
B. Chaque tenant peut apporter sa propre clé
```

Pour un SaaS centralisé, privilégier A.

Si B existe :

- chiffrement par tenant ;
- RBAC ;
- aucune fuite inter-tenant ;
- index `tenantId` ;
- rate limit par tenant ;
- logs avec identifiant interne, jamais clé.

---

# 41. File d'attente

Ne pas déclencher 100 appels MusicGPT en parallèle.

Créer une queue existante ou réutiliser celle du projet.

Pseudo-code :

```ts
await musicQueue.add(
  "musicgpt-generate",
  { generationId },
  {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
);
```

Le nombre de workers simultanés dépend de :

```ts
config.maxParallelJobs
```

Ne pas réessayer automatiquement un `402 INSUFFICIENT_CREDITS`.

---

# 42. Observabilité

Journaliser :

- generationId ;
- provider ;
- endpoint logique ;
- taskId ;
- conversion IDs ;
- modèle demandé ;
- modèle effectif ;
- statut ;
- durée de traitement ;
- code HTTP ;
- code d'erreur interne ;
- credit estimate.

Ne jamais journaliser :

- clé API ;
- token webhook ;
- contenu complet d'un header Authorization ;
- données sensibles inutiles.

Exemple safe :

```ts
logger.info("musicgpt.generation.created", {
  generationId,
  taskId,
  model: effectiveModel,
});
```

---

# 43. Sentry / monitoring

Avant d'envoyer une exception :

```ts
sanitizeMusicGptError(error)
```

Configurer les règles de redaction pour :

```text
authorization
apiKey
api_key
webhookToken
token
cookie
set-cookie
```

Ne pas envoyer le payload brut si celui-ci contient des données sensibles.

---

# 44. Sécurité SSRF pour les URLs audio

Les URLs renvoyées par un fournisseur externe ne doivent pas être téléchargées aveuglément.

Le downloader doit :

- exiger HTTPS ;
- refuser localhost ;
- refuser `127.0.0.0/8` ;
- refuser `10.0.0.0/8` ;
- refuser `172.16.0.0/12` ;
- refuser `192.168.0.0/16` ;
- refuser les adresses link-local ;
- limiter les redirections ;
- revalider la destination après redirection ;
- limiter taille et durée ;
- vérifier le MIME.

Une allowlist configurable des domaines MusicGPT/CDN peut être ajoutée sans bloquer une future migration de CDN.

---

# 45. Uploads audio

Pour Remix/Inpaint/Extend/Sing Over Instrumental :

- taille maximale côté serveur ;
- types MIME autorisés ;
- MP3 prioritaire ;
- scan/validation ;
- nom de fichier généré ;
- jamais utiliser le nom original comme chemin de stockage ;
- supprimer les fichiers temporaires ;
- contrôler la durée audio lorsque l'endpoint impose une limite.

La documentation MusicGPT indique des limites spécifiques de longueur d'entrée selon les fonctions ; l'implémentation doit lire la valeur actuelle de la documentation avant de modifier ces limites.

---

# 46. Album cover

`generate_album_cover` peut être activé.

Le résultat image :

- est un complément ;
- ne doit jamais empêcher la publication de l'audio si l'audio est valide ;
- peut être copié dans le stockage SaaS selon la politique existante.

L'audio MP3 reste le résultat principal.

---

# 47. Lyrics timestamps

Si :

```ts
lyrics_timestamps = true
```

stocker les timestamps dans un champ JSON séparé.

Exemple interne :

```ts
{
  lyrics: "...",
  lyricsTimestamps: [...]
}
```

Cela peut servir à :

- karaoké ;
- surlignage synchronisé ;
- affichage des paroles pendant la lecture.

Ne pas mélanger ces données avec le fichier MP3.

---

# 48. Streaming des modèles Pro

Certains modèles Pro peuvent retourner un `streaming_url` HLS.

Pour ce projet :

- MP3 reste le format final ;
- streaming = aperçu facultatif ;
- ne jamais enregistrer `.m3u8` comme fichier musical final ;
- ne pas afficher « Télécharger HLS » ;
- ne pas convertir l'architecture du produit en streaming-only.

Si le produit n'a pas besoin d'aperçu temps réel, garder l'option désactivée.

---

# 49. Paramètres du dashboard recommandés

Exemple objet de configuration :

```ts
type MusicGptOwnerSettings = {
  enabled: boolean;

  defaultModel:
    | "v6"
    | "v6-pro"
    | "v7"
    | "v7-pro";

  defaultGender?:
    | "male"
    | "female"
    | "neutral";

  defaultVoiceId?: string;

  generateAlbumCover: boolean;
  lyricsTimestamps: boolean;

  finalFormat: "mp3";

  copyToOwnStorage: boolean;
  maxParallelJobs: number;

  useWebhook: true;

  allowRemix: boolean;
  allowInpaint: boolean;
  allowExtend: boolean;
  allowSingOverInstrumental: boolean;
  allowImageToSong: boolean;
};
```

`finalFormat` doit être verrouillé :

```ts
finalFormat: "mp3"
```

---

# 50. Ne pas exposer le provider aux utilisateurs si le produit l'abstrait

Si le SaaS est conçu avec une couche de fournisseurs :

```text
Music Provider
├── MusicGPT
├── Musicful
├── autre provider
```

l'interface publique peut simplement afficher :

```text
Générer ma chanson
```

La sélection de MusicGPT peut rester un choix propriétaire.

Architecture recommandée :

```ts
interface MusicProvider {
  generate(input: SongRequest): Promise<MusicJob>;
  getStatus(id: string): Promise<MusicJobStatus>;
}
```

Puis :

```ts
class MusicGptProvider
  implements MusicProvider {
  // ...
}
```

Cela évite de coupler tout le SaaS à MusicGPT.

---

# 51. Compatibilité avec les autres fournisseurs déjà présents

Si le projet contient Musicful ou un autre générateur :

- ne pas remplacer automatiquement le provider existant ;
- ajouter MusicGPT comme provider supplémentaire ;
- réutiliser le même schéma interne de chanson ;
- normaliser les formats ;
- préserver la bibliothèque utilisateur ;
- préserver le système de crédits SaaS ;
- préserver les historiques ;
- préserver les jobs existants.

Exemple :

```ts
type MusicProviderId =
  | "musicful"
  | "musicgpt";
```

Le propriétaire peut ensuite choisir :

```text
Fournisseur par défaut : MusicGPT
```

---

# 52. Flux complet de génération

```text
1. Utilisateur remplit le formulaire.
2. Frontend valide les champs UX.
3. Serveur revalide avec Zod.
4. Serveur contrôle auth, tenant, quota.
5. Serveur charge la config MusicGPT.
6. Serveur déchiffre la clé.
7. Serveur construit prompt + payload.
8. Serveur choisit le modèle effectif.
9. Serveur crée le job interne.
10. Serveur appelle MusicGPT V2.
11. Serveur stocke task_id + 2 conversion_id.
12. UI affiche "Génération en cours".
13. MusicGPT appelle le webhook HTTPS.
14. Webhook retrouve la génération.
15. Webhook extrait uniquement le MP3.
16. Serveur copie le MP3 vers son stockage.
17. Serveur met à jour Version A ou B.
18. Quand les deux variantes sont terminées :
    statut = COMPLETED.
19. UI affiche deux lecteurs.
20. Téléchargement = .mp3 uniquement.
```

---

# 53. Contrat de réponse interne

Éviter de renvoyer le payload MusicGPT brut au frontend.

Exemple :

```ts
type GenerateSongResponse = {
  generationId: string;

  status:
    | "QUEUED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

  provider: "musicgpt";

  model: string;

  variants: Array<{
    id: string;
    status: string;
    mp3Url?: string;
    duration?: number;
    coverUrl?: string;
  }>;

  creditEstimate?: number;
};
```

---

# 54. Confidentialité

Le prompt et les paroles peuvent contenir du contenu utilisateur.

Ne conserver que ce qui est nécessaire pour :

- historique ;
- reproduction d'un job ;
- support ;
- facturation interne.

Respecter les paramètres de rétention du SaaS.

Ne pas ajouter de collecte supplémentaire uniquement pour MusicGPT sans besoin produit.

---

# 55. Test d'intégrité obligatoire

Après intégration, exécuter au minimum les tests suivants.

## Dashboard propriétaire

- [ ] La rubrique MusicGPT est visible uniquement au propriétaire.
- [ ] Une nouvelle clé peut être enregistrée.
- [ ] Le champ sensible est gris.
- [ ] La clé est masquée.
- [ ] Recharger la page ne révèle pas la clé.
- [ ] « Tester la connexion » fonctionne.
- [ ] Un utilisateur normal reçoit 401/403 sur les routes owner.
- [ ] La clé n'apparaît pas dans le HTML.
- [ ] La clé n'apparaît pas dans le bundle JavaScript.
- [ ] La clé n'apparaît pas dans les requêtes réseau du navigateur.
- [ ] La clé n'apparaît pas dans les logs.

## Génération

- [ ] Prompt mode fonctionne.
- [ ] Custom lyrics fonctionne.
- [ ] Instrumental fonctionne.
- [ ] Vocal-only fonctionne.
- [ ] `voice_id` fonctionne.
- [ ] vocal-only/voice affiche le modèle effectif v6.
- [ ] v6 fonctionne.
- [ ] v6-pro fonctionne selon le plan.
- [ ] v7 fonctionne.
- [ ] v7-pro fonctionne selon le plan.
- [ ] Deux `conversion_id` sont enregistrés.
- [ ] Version A est affichée.
- [ ] Version B est affichée.
- [ ] `credit_estimate` est conservé.
- [ ] La couverture est conservée si activée.
- [ ] Les timestamps sont conservés si activés.

## MP3 only

- [ ] `conversion_path` MP3 est utilisé.
- [ ] `conversion_path_wav` est ignoré.
- [ ] Aucun WAV n'est exposé.
- [ ] Aucun bouton WAV n'existe.
- [ ] Aucun `.wav` n'est enregistré comme asset final.
- [ ] Un MP3 peut être téléchargé.
- [ ] Le header de téléchargement indique `audio/mpeg`.
- [ ] Le nom téléchargé termine par `.mp3`.

## Webhook

- [ ] HTTPS obligatoire.
- [ ] Token webhook valide.
- [ ] Token invalide rejeté.
- [ ] `task_id` inconnu rejeté/loggé.
- [ ] Doublon webhook idempotent.
- [ ] Webhook ne crée pas deux fichiers identiques.
- [ ] URL audio expirante copiée rapidement.
- [ ] URL non HTTPS refusée.
- [ ] Adresse privée refusée.
- [ ] Mauvais MIME refusé.

## Erreurs

- [ ] 400 affiché proprement.
- [ ] 401 déclenche alerte propriétaire.
- [ ] 402 déclenche alerte crédits.
- [ ] 429 passe par queue/backoff.
- [ ] 5xx n'expose pas le body brut.
- [ ] Timeout est géré.
- [ ] Une panne MusicGPT ne casse pas le dashboard.

## Régression

- [ ] Les autres providers fonctionnent encore.
- [ ] L'authentification fonctionne.
- [ ] Le système de crédits SaaS fonctionne.
- [ ] Les anciennes chansons restent lisibles.
- [ ] Le stockage existant fonctionne.
- [ ] Les pages desktop fonctionnent.
- [ ] Les pages mobile fonctionnent.
- [ ] Les tests existants passent.
- [ ] `npm audit` ne révèle pas de nouvelle faille critique liée à l'intégration.

---

# 56. Tests unitaires recommandés

Tester :

```text
buildMusicGptPrompt()
normalizeMusicGptPrompt()
modelResolver()
musicGptGenerationSchema
mapMusicGptError()
extractMp3FromWebhook()
isWebhookIdempotent()
sanitizeProviderPayload()
encrypt/decrypt config
```

Test du modèle :

```ts
expect(
  resolveMusicGptModel({
    requestedModel: "v7",
    voiceId: "voice_123",
    vocalOnly: false,
  }),
).toBe("v6");
```

Test MP3 :

```ts
expect(
  extractFinalAudio({
    conversion_path:
      "https://cdn.example/song.mp3",
    conversion_path_wav:
      "https://cdn.example/song.wav",
  }),
).toEqual({
  format: "mp3",
  url: "https://cdn.example/song.mp3",
});
```

---

# 57. Tests d'intégration recommandés

Mock MusicGPT pour tester :

1. création réussie ;
2. deux variantes ;
3. webhook variant 1 ;
4. webhook variant 2 ;
5. webhook dupliqué ;
6. absence de MP3 ;
7. clé invalide ;
8. crédits insuffisants ;
9. rate limit ;
10. erreur 500 ;
11. webhook retardé ;
12. récupération fallback par `Get by ID`.

---

# 58. UX utilisateur

Pendant la génération :

```text
Création de votre chanson…
MusicGPT prépare deux versions.
```

Puis :

```text
Version A
[▶ lecteur]
[Télécharger MP3]

Version B
[▶ lecteur]
[Télécharger MP3]
```

Ne pas afficher des détails techniques comme :

```text
conversion_path_wav
task_id
Authorization
provider payload
```

à l'utilisateur final.

---

# 59. UX propriétaire

Bloc recommandé :

```text
MusicGPT
────────────────────────────────────────
État                 ● Connecté

Clé API               [••••••••••••••]   [Remplacer]
Modèle                [v7 ▼]
Genre vocal           [Neutral ▼]
Voix par défaut       [Aucune ▼]

☑ Générer la pochette
☑ Timestamps des paroles
☑ Copier les MP3 dans notre stockage

Format final           MP3 uniquement
Générations parallèles [1]

[Test de connexion] [Enregistrer]
```

Le champ de clé API et le bloc webhook secret doivent être visuellement gris.

---

# 60. Alerte crédits propriétaire

En cas de `402` :

```text
MusicGPT : crédits insuffisants.
Les nouvelles générations sont temporairement bloquées.
Rechargez votre compte MusicGPT puis retestez la connexion.
```

Ne pas afficher cette alerte aux utilisateurs comme une erreur technique brute.

Pour eux :

```text
La génération musicale est temporairement indisponible.
```

---

# 61. Alerte rate-limit

En cas de `429` :

- ne pas demander à l'utilisateur de recliquer ;
- remettre le job en attente ;
- appliquer le backoff ;
- afficher :

```text
Votre chanson est dans la file de génération.
```

---

# 62. Durée souhaitée

Si le SaaS possède une durée comme :

```text
2 min
3 min
4 min
```

ne pas envoyer un paramètre API non documenté.

Ajouter au prompt :

```text
Durée souhaitée approximative : 4 minutes.
```

Traiter cela comme une consigne, pas comme une garantie stricte.

Si une future version de MusicGPT documente un paramètre natif de durée, créer un adapter versionné avant de l'utiliser.

---

# 63. Style musical local

Pour améliorer les styles locaux :

- utiliser `music_style` pour le nom court du style ;
- utiliser `prompt` pour la description détaillée ;
- décrire instrumentation, rythme, ambiance et contexte culturel ;
- éviter les noms d'artistes.

Exemple Zouglou :

```text
music_style = "Zouglou"
```

```text
prompt =
"Zouglou ivoirien, rythme dansant, percussions organiques,
guitare rythmique, basse chaleureuse, chœurs collectifs,
voix conversationnelles, ambiance festive et sociale."
```

Exemple Coupé-Décalé :

```text
music_style = "Coupé-Décalé"
```

```text
prompt =
"Coupé-Décalé ivoirien très énergique, percussions électroniques,
basse puissante, synthés brillants, appels-réponses, ambiance de fête."
```

Cette méthode est préférable à l'utilisation de noms d'artistes.

---

# 64. Paramètres impossibles ou non natifs

Si le SaaS possède un champ que MusicGPT ne supporte pas nativement :

```text
occasion
public cible
niveau d'énergie
pays
description du personnage
message à transmettre
contexte religieux
spot publicité
```

ne pas le supprimer.

L'incorporer dans le prompt de manière compacte et utile.

---

# 65. Références musicales utilisateur

Si le produit permet d'ajouter des références audio :

- ne pas supposer que Music AI V2 accepte cinq URLs de référence si ce n'est pas documenté ;
- utiliser les endpoints audio dédiés lorsque leur contrat le permet ;
- ne pas inventer de paramètre `reference_tracks`.

Une fonctionnalité produit ne doit jamais créer un payload non documenté.

---

# 66. Feature flags

Ajouter des flags pour éviter d'exposer une fonctionnalité avant qu'elle soit prête :

```ts
{
  musicgptGenerate: true,
  musicgptVoices: true,
  musicgptRemix: false,
  musicgptInpaint: false,
  musicgptExtend: false,
  musicgptSingOverInstrumental: false,
  musicgptImageToSong: false
}
```

Permet d'intégrer progressivement sans casser le produit.

---

# 67. Migration progressive

Ordre conseillé :

```text
Phase 1
- configuration propriétaire
- chiffrement clé
- test connexion

Phase 2
- Music AI V2
- deux variantes
- MP3 only

Phase 3
- webhook
- stockage permanent
- queue/rate limiting

Phase 4
- voix

Phase 5
- Remix / Extend / Inpaint

Phase 6
- fonctions avancées facultatives

Phase 7
- tests d'intégrité
- staging
- production
```

Ne pas déployer directement en production sans staging si le projet dispose d'un environnement de staging.

---

# 68. Variables d'environnement

Exemple :

```env
MUSICGPT_BASE_URL=https://api.musicgpt.com/api/public
INTEGRATION_ENCRYPTION_KEY=...
APP_BASE_URL=https://example.com
```

La clé MusicGPT propriétaire ne doit pas obligatoirement être dans `.env` si elle est gérée dans le dashboard.

En développement uniquement, un fallback peut être autorisé :

```env
MUSICGPT_API_KEY_DEV=...
```

Ne jamais utiliser ce fallback en production si le dashboard doit être la source de vérité.

---

# 69. Fichiers recommandés

Adapter au projet existant.

Exemple Next.js :

```text
src/
├── lib/
│   ├── music/
│   │   ├── providers/
│   │   │   ├── musicgpt/
│   │   │   │   ├── client.ts
│   │   │   │   ├── schemas.ts
│   │   │   │   ├── prompt-builder.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── webhook.ts
│   │   │   │   ├── mp3-ingest.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── types.ts
│   └── crypto/
│       └── secrets.ts
│
├── app/
│   └── api/
│       ├── owner/
│       │   └── integrations/
│       │       └── musicgpt/
│       ├── music/
│       │   ├── generate/
│       │   └── voices/
│       └── webhooks/
│           └── musicgpt/
│
└── components/
    └── owner/
        └── integrations/
            └── MusicGptSettings.tsx
```

Ne pas forcer cette arborescence si le projet possède déjà un système providers/integrations.

---

# 70. Commande d'exécution pour l'agent

Quand ce skill est invoqué :

1. analyser le projet avant de modifier ;
2. identifier framework, ORM, auth, stockage, système de crédits et provider musical existant ;
3. identifier les paramètres actuels du formulaire de chanson ;
4. identifier les conventions UI du dashboard propriétaire ;
5. vérifier les variables d'environnement et `.gitignore` ;
6. créer un plan de modification minimal ;
7. implémenter la configuration MusicGPT ;
8. chiffrer la clé ;
9. implémenter le client MusicGPT ;
10. implémenter Music AI V2 ;
11. mapper tous les paramètres existants ;
12. implémenter le webhook ;
13. implémenter le stockage MP3 ;
14. implémenter les deux variantes ;
15. intégrer les voix ;
16. ajouter les fonctions avancées nécessaires ;
17. ajouter queue/rate limit ;
18. ajouter les tests ;
19. exécuter lint/typecheck/tests/build ;
20. corriger toute régression liée aux changements ;
21. produire un rapport final.

---

# 71. Interdictions pour l'agent

Ne jamais :

- exposer la clé MusicGPT côté client ;
- stocker la clé en clair ;
- mettre la clé dans Git ;
- imprimer la clé ;
- envoyer la clé à Sentry ;
- utiliser V1 pour une nouvelle génération principale si V2 est disponible ;
- conserver WAV comme sortie finale ;
- ajouter un bouton WAV ;
- inventer un paramètre MusicGPT ;
- ignorer les paramètres métier existants ;
- supprimer un provider existant sans demande ;
- contourner les limites de débit ;
- déclencher des générations en boucle après une erreur 402 ;
- déployer en production sans tests si un staging existe ;
- remplacer une architecture existante saine par une réécriture inutile.

---

# 72. Critères d'acceptation finaux

L'intégration est terminée seulement lorsque :

- [ ] le propriétaire peut entrer la clé MusicGPT dans son dashboard ;
- [ ] le champ de clé est gris et masqué ;
- [ ] la clé est chiffrée ;
- [ ] la clé ne revient jamais au frontend ;
- [ ] le bouton de test fonctionne ;
- [ ] Music AI V2 génère correctement ;
- [ ] tous les paramètres utiles du SaaS sont mappés ;
- [ ] les quatre modèles peuvent être sélectionnés selon compatibilité ;
- [ ] les contraintes voice/vocal-only → v6 sont respectées ;
- [ ] deux variantes sont gérées ;
- [ ] les webhooks fonctionnent ;
- [ ] le fallback Get by ID fonctionne ;
- [ ] les MP3 sont conservés ;
- [ ] les WAV sont ignorés ;
- [ ] le téléchargement final est MP3 ;
- [ ] la queue respecte le plan ;
- [ ] les crédits insuffisants sont correctement signalés ;
- [ ] les voix fonctionnent ;
- [ ] les fonctions avancées activées fonctionnent ;
- [ ] les erreurs sont propres ;
- [ ] aucune régression majeure n'est introduite ;
- [ ] lint passe ;
- [ ] typecheck passe ;
- [ ] tests passent ;
- [ ] build production passe ;
- [ ] test staging passe avant production.

---

# 73. Sources officielles vérifiées

Documentation principale :

- https://docs.musicgpt.com/api-documentation/index/introduction
- https://docs.musicgpt.com/api-documentation/conversions/musicaiv2
- https://docs.musicgpt.com/api-documentation/index/webhook
- https://docs.musicgpt.com/api-documentation/endpoint/getById
- https://docs.musicgpt.com/api-documentation/endpoint/getAllVoices
- https://docs.musicgpt.com/api-documentation/endpoint/searchVoices
- https://docs.musicgpt.com/api-documentation/utilities/prompt_guideline
- https://docs.musicgpt.com/api-documentation/utilities/ratelimits
- https://docs.musicgpt.com/api-documentation/utilities/error
- https://docs.musicgpt.com/api-documentation/index/pricing

Fonctions musicales :

- https://docs.musicgpt.com/api-documentation/conversions/remix
- https://docs.musicgpt.com/api-documentation/conversions/inpaint
- https://docs.musicgpt.com/api-documentation/conversions/extend
- https://docs.musicgpt.com/api-documentation/conversions/sing_over_instrumental
- https://docs.musicgpt.com/api-documentation/conversions/image_to_song

Toujours revérifier la documentation officielle avant d'ajouter un nouveau paramètre, car les endpoints, modèles et options peuvent évoluer.

---

# 74. Résultat attendu de l'agent

À la fin d'une implémentation réelle, répondre en français avec :

```text
✅ MusicGPT intégré
✅ Clé API protégée dans le dashboard propriétaire
✅ Music AI V2 actif
✅ MP3 uniquement
✅ Deux variantes prises en charge
✅ Webhook + fallback polling
✅ Stockage permanent des MP3
✅ Voix intégrées
✅ Paramètres existants conservés
✅ Rate limiting / queue
✅ Tests d'intégrité passés
```

Puis préciser :

- fichiers ajoutés/modifiés ;
- migrations ;
- variables d'environnement nécessaires ;
- endpoints créés ;
- tests exécutés ;
- éventuels points restant à configurer manuellement.

Ne jamais prétendre qu'un test a réussi s'il n'a pas réellement été exécuté.
