---
name: openai-music-writer
description: >
  Intègre l’API OpenAI dans un SaaS Next.js pour générer des paroles de musique,
  améliorer/réécrire des textes et thèses, exécuter des tâches IA personnalisées,
  gérer la clé API depuis une interface d’administration sécurisée, contrôler les
  modèles, quotas, prompts, journaux et erreurs. Utiliser ce skill lorsqu’un projet
  doit ajouter, réparer, auditer ou refactoriser une intégration OpenAI côté serveur.
version: 1.0.0
---

# OpenAI Music Writer Skill

## 1. Objectif

Ce skill sert à intégrer proprement l’API OpenAI dans un site ou SaaS de génération de paroles de musique, avec une priorité particulière sur :

- génération de paroles complètes ;
- création de refrains, couplets, ponts, intros et outros ;
- réécriture et amélioration de paroles existantes ;
- adaptation d’un texte à un style musical, une ambiance, une langue ou un thème ;
- correction grammaticale et stylistique ;
- amélioration, reformulation et structuration de textes longs ou de thèses ;
- résumé, expansion, traduction et changement de ton ;
- tâches IA personnalisées définies depuis le tableau de bord ;
- administration sécurisée de la connexion OpenAI.

Le projet cible principalement **Next.js / TypeScript**, avec appels OpenAI uniquement côté serveur.

---

# 2. Règles absolues

1. Ne jamais exposer une clé API OpenAI dans :
   - le navigateur ;
   - le JavaScript client ;
   - `NEXT_PUBLIC_*` ;
   - le HTML ;
   - les logs ;
   - Git/GitHub ;
   - une application Android/iOS distribuée.

2. Tous les appels OpenAI doivent passer par le backend du SaaS.

3. Si l’administrateur saisit une clé depuis le tableau de bord :
   - transmettre la clé uniquement en HTTPS ;
   - la traiter dans une Route Handler / Server Action ;
   - la chiffrer avant stockage ;
   - ne jamais la renvoyer en clair au frontend ;
   - afficher uniquement une version masquée, par exemple `sk-proj-••••••••9F2A`.

4. Prévoir une clé de chiffrement séparée, par exemple :

```env
APP_SECRETS_ENCRYPTION_KEY="..."
```

Cette clé doit rester dans les secrets du serveur/Vercel et ne doit jamais être stockée dans la base de données avec la clé OpenAI.

5. Supporter aussi le mode environnement :

```env
OPENAI_API_KEY="..."
```

6. L’ordre recommandé de résolution est :
   1. clé configurée pour le tenant/projet dans la base de données ;
   2. sinon `OPENAI_API_KEY` côté serveur ;
   3. sinon retourner une erreur de configuration explicite.

7. Ne jamais enregistrer le texte complet d’une clé API dans les logs, exceptions ou analytics.

---

# 3. Architecture cible

```text
Utilisateur
   ↓
Interface génération de paroles / éditeur de texte
   ↓
POST /api/ai/generate
   ↓
Auth + Zod + rate limiting + contrôle quota
   ↓
AI Service
   ↓
Récupération sécurisée de la clé OpenAI
   ↓
OpenAI Responses API
   ↓
Normalisation de la réponse
   ↓
Historique / usage / réponse utilisateur
```

Administration :

```text
Admin SaaS
   ↓
Paramètres > Intelligence artificielle > OpenAI
   ↓
Saisie clé API + modèle + limites + options
   ↓
POST /api/admin/ai/openai
   ↓
Auth admin + Zod
   ↓
Test de connexion
   ↓
Chiffrement
   ↓
Base de données
```

---

# 4. Dépendances recommandées

```bash
npm install openai zod
```

Si Prisma est utilisé :

```bash
npm install @prisma/client
```

Le projet peut réutiliser son système existant pour :
- authentification ;
- rate limiting ;
- chiffrement ;
- base de données ;
- journalisation ;
- gestion des tenants.

Ne pas ajouter une seconde solution si une solution fiable existe déjà dans le kit.

---

# 5. Modèles OpenAI

Le modèle doit être configurable depuis le tableau de bord.

Valeur recommandée par défaut :

```text
gpt-5.6-terra
```

Options suggérées :

- `gpt-5.6-luna` : coût réduit / génération à fort volume ;
- `gpt-5.6-terra` : bon équilibre qualité/coût ;
- `gpt-5.6-sol` : qualité maximale pour les tâches complexes.

Ne pas coder en dur la liste comme une vérité permanente. Prévoir une configuration permettant de modifier l’identifiant du modèle sans refactoriser l’application.

---

# 6. Variables d’environnement

Exemple :

```env
OPENAI_API_KEY=""
APP_SECRETS_ENCRYPTION_KEY=""
OPENAI_DEFAULT_MODEL="gpt-5.6-terra"
OPENAI_MAX_OUTPUT_TOKENS="4000"
```

`OPENAI_API_KEY` reste optionnelle si le SaaS permet à l’administrateur de configurer sa clé dans le dashboard.

Ne jamais utiliser :

```env
NEXT_PUBLIC_OPENAI_API_KEY=
```

---

# 7. Modèle Prisma suggéré

Adapter ce modèle au système multi-tenant existant.

```prisma
model AiProviderConfig {
  id                String   @id @default(cuid())
  tenantId          String?
  provider          String   @default("openai")
  enabled           Boolean  @default(true)

  apiKeyCiphertext  String?
  apiKeyIv          String?
  apiKeyAuthTag     String?
  apiKeyLast4       String?

  defaultModel      String   @default("gpt-5.6-terra")
  maxOutputTokens   Int      @default(4000)
  temperature       Float?
  monthlyTokenLimit Int?
  monthlyCostLimit  Decimal?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, provider])
}
```

Ne jamais ajouter une colonne `apiKey String` contenant le secret en clair.

---

# 8. Chiffrement de la clé

Utiliser AES-256-GCM ou le système de secrets déjà présent dans le projet.

Exemple conceptuel :

```ts
type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptSecret(value: string): EncryptedSecret {
  // AES-256-GCM avec APP_SECRETS_ENCRYPTION_KEY
}

export function decryptSecret(secret: EncryptedSecret): string {
  // Déchiffrement uniquement côté serveur
}
```

Contraintes :

- fonctions placées dans un module `server-only` ;
- aucune importation depuis un Client Component ;
- clé maître de 32 octets minimum après décodage ;
- IV unique à chaque chiffrement ;
- rotation des secrets prévue ;
- éviter d’écrire le secret déchiffré dans les logs.

---

# 9. Écran du tableau de bord

Créer une page, par exemple :

```text
/dashboard/settings/ai
```

ou :

```text
/dashboard/settings/integrations/openai
```

## Sections

### Fournisseur IA

- Fournisseur : OpenAI
- Statut : Activé / Désactivé
- État de connexion :
  - Non configuré
  - Connecté
  - Erreur
  - Clé expirée / invalide

### Clé API

Champ :

```text
Clé API OpenAI
[ sk-proj-•••••••••••••••••••• ]
```

Boutons :

- Enregistrer
- Tester la connexion
- Remplacer la clé
- Supprimer la clé

Après sauvegarde :
- vider le champ ;
- ne jamais réinjecter la clé complète dans le DOM ;
- afficher uniquement le suffixe connu (`••••ABCD`).

### Modèle

Sélecteur :

```text
GPT-5.6 Luna
GPT-5.6 Terra
GPT-5.6 Sol
Personnalisé
```

Avec champ libre pour un identifiant de modèle personnalisé.

### Limites

- tokens maximum par réponse ;
- requêtes/minute par utilisateur ;
- requêtes/jour ;
- quota mensuel ;
- limite de caractères du prompt ;
- longueur maximale des paroles ;
- coût mensuel interne optionnel.

### Fonctions

Toggles :

- Génération de paroles
- Réécriture de paroles
- Amélioration de texte
- Correction
- Résumé
- Traduction
- Thèses / documents longs
- Tâches personnalisées

---

# 10. Validation Zod de la configuration

```ts
import { z } from "zod";

export const openAiSettingsSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20)
    .max(500)
    .optional(),

  enabled: z.boolean(),

  defaultModel: z
    .string()
    .trim()
    .min(1)
    .max(100),

  maxOutputTokens: z
    .number()
    .int()
    .min(100)
    .max(128000),

  monthlyTokenLimit: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});
```

Ne jamais se fier uniquement à la validation frontend.

---

# 11. Client OpenAI côté serveur

Créer un service central :

```ts
// lib/ai/openai-client.ts
import "server-only";
import OpenAI from "openai";

export function createOpenAIClient(apiKey: string) {
  return new OpenAI({
    apiKey,
  });
}
```

Ne pas instancier le client dans un composant React client.

---

# 12. Appel avec Responses API

Exemple de service :

```ts
// lib/ai/openai-service.ts
import "server-only";
import { createOpenAIClient } from "./openai-client";

export async function generateText({
  apiKey,
  model,
  instructions,
  input,
  maxOutputTokens = 4000,
}: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}) {
  const openai = createOpenAIClient(apiKey);

  const response = await openai.responses.create({
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
  });

  return {
    id: response.id,
    text: response.output_text,
  };
}
```

Toutes les fonctionnalités du SaaS doivent passer par un service commun de ce type afin de centraliser :
- sécurité ;
- modèle ;
- quotas ;
- monitoring ;
- erreurs ;
- journalisation ;
- usage.

---

# 13. Route principale IA

Exemple :

```text
POST /api/ai/generate
```

Payload :

```json
{
  "task": "lyrics.generate",
  "input": {
    "topic": "amour à distance",
    "genre": "Afrobeats",
    "language": "fr",
    "mood": "romantique",
    "duration": "3m30",
    "structure": ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus"],
    "explicit": false
  }
}
```

Pipeline obligatoire :

1. authentifier l’utilisateur ;
2. vérifier le tenant ;
3. valider avec Zod ;
4. vérifier que la fonction est activée ;
5. contrôler quota/rate limit ;
6. charger la configuration OpenAI ;
7. déchiffrer la clé côté serveur ;
8. construire le prompt serveur ;
9. appeler OpenAI ;
10. normaliser la sortie ;
11. enregistrer uniquement les métriques nécessaires ;
12. renvoyer la réponse.

---

# 14. Schéma Zod des tâches

```ts
import { z } from "zod";

export const aiTaskSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("lyrics.generate"),
    input: z.object({
      topic: z.string().min(2).max(1000),
      genre: z.string().min(1).max(100),
      language: z.string().min(2).max(50),
      mood: z.string().max(100).optional(),
      duration: z.string().max(30).optional(),
      structure: z.array(z.string().max(50)).max(20).optional(),
      explicit: z.boolean().default(false),
      additionalInstructions: z.string().max(3000).optional(),
    }),
  }),

  z.object({
    task: z.literal("lyrics.rewrite"),
    input: z.object({
      text: z.string().min(1).max(30000),
      instruction: z.string().min(2).max(3000),
      language: z.string().max(50).optional(),
    }),
  }),

  z.object({
    task: z.literal("text.improve"),
    input: z.object({
      text: z.string().min(1).max(100000),
      goal: z.string().max(2000).optional(),
      preserveMeaning: z.boolean().default(true),
    }),
  }),

  z.object({
    task: z.literal("thesis.improve"),
    input: z.object({
      text: z.string().min(1).max(150000),
      instruction: z.string().max(3000).optional(),
      academicLevel: z.string().max(100).optional(),
      language: z.string().max(50).optional(),
    }),
  }),

  z.object({
    task: z.literal("custom"),
    input: z.object({
      prompt: z.string().min(1).max(20000),
    }),
  }),
]);
```

Pour les documents extrêmement longs, utiliser une stratégie de découpage contrôlé plutôt que d’envoyer aveuglément l’intégralité du document.

---

# 15. Prompt système — génération de paroles

Créer les instructions côté serveur et ne pas laisser le navigateur décider seul des règles.

Exemple :

```ts
export const LYRICS_SYSTEM_INSTRUCTIONS = `
Tu es un assistant professionnel de création de chansons.

OBJECTIF
Créer des paroles originales adaptées aux paramètres fournis par l'utilisateur.

RÈGLES
- Respecter la langue demandée.
- Respecter le genre musical, l'ambiance et la structure.
- Produire des paroles chantables et rythmiques.
- Éviter les répétitions involontaires.
- Créer un refrain mémorable.
- Ne pas prétendre reproduire exactement le style d'un artiste vivant.
- Si un artiste est donné comme référence, convertir la demande en caractéristiques
  musicales générales : tempo, énergie, instrumentation, phrasé, thème, densité,
  structure et ambiance.
- Ne jamais copier des paroles protégées existantes.
- Produire uniquement du contenu original.
- Respecter la préférence explicite/non explicite.
`;
```

---

# 16. Constructeur de prompt pour les paroles

```ts
export function buildLyricsPrompt(input: {
  topic: string;
  genre: string;
  language: string;
  mood?: string;
  duration?: string;
  structure?: string[];
  explicit?: boolean;
  additionalInstructions?: string;
}) {
  return `
Crée une chanson originale.

THÈME:
${input.topic}

GENRE:
${input.genre}

LANGUE:
${input.language}

AMBIANCE:
${input.mood ?? "libre"}

DURÉE CIBLE:
${input.duration ?? "non précisée"}

STRUCTURE:
${input.structure?.join(" → ") ?? "Intro → Couplet 1 → Refrain → Couplet 2 → Refrain → Pont → Refrain"}

CONTENU EXPLICITE:
${input.explicit ? "autorisé selon les règles de la plateforme" : "non"}

INSTRUCTIONS SUPPLÉMENTAIRES:
${input.additionalInstructions ?? "aucune"}

FORMAT:
[Titre]
...

[Intro]
...

[Couplet 1]
...

[Refrain]
...

[Couplet 2]
...

[Pont]
...

[Refrain final]
...
`;
}
```

---

# 17. Fonctions musicales à implémenter

Le moteur doit pouvoir recevoir les tâches suivantes :

```text
lyrics.generate
lyrics.rewrite
lyrics.extend
lyrics.shorten
lyrics.chorus
lyrics.verse
lyrics.bridge
lyrics.title
lyrics.hook
lyrics.rhymes
lyrics.change_language
lyrics.change_genre
lyrics.change_mood
lyrics.clean_explicit
lyrics.make_explicit
lyrics.structure
lyrics.feedback
```

Exemples d’actions dans l’éditeur :

- Générer une chanson
- Régénérer
- Améliorer
- Continuer
- Raccourcir
- Allonger
- Rendre plus accrocheur
- Créer un refrain
- Ajouter un couplet
- Ajouter un pont
- Modifier le ton
- Changer de genre
- Traduire
- Corriger
- Trouver des rimes
- Créer un titre

---

# 18. Interface de création de paroles

Créer une expérience de type studio.

## Colonne de paramètres

- Thème / idée
- Genre musical
- Langue
- Ambiance
- Voix narrative :
  - je
  - tu
  - nous
  - troisième personne
- Durée cible
- BPM optionnel
- Structure
- Niveau de créativité
- Contenu explicite
- Instructions supplémentaires

## Zone principale

Éditeur des paroles avec :
- génération en streaming si activée ;
- sélection d’un passage ;
- actions IA sur la sélection ;
- historique des versions ;
- annuler/rétablir ;
- copier ;
- exporter ;
- sauvegarder.

## Actions contextuelles

Lorsqu’un utilisateur sélectionne un passage :

```text
Améliorer
Réécrire
Plus poétique
Plus simple
Plus émotionnel
Plus rythmé
Trouver des rimes
Continuer
Traduire
Corriger
```

---

# 19. Amélioration de texte et de thèse

Créer des modes séparés.

## text.improve

Objectifs possibles :

- corriger ;
- reformuler ;
- rendre plus professionnel ;
- rendre plus naturel ;
- rendre plus clair ;
- raccourcir ;
- développer ;
- traduire ;
- changer de ton ;
- restructurer.

## thesis.improve

Fonctions :

- améliorer la clarté ;
- corriger la grammaire ;
- améliorer la structure ;
- renforcer les transitions ;
- reformuler sans modifier le sens ;
- proposer un plan ;
- résumer une section ;
- transformer des notes en texte structuré ;
- identifier les passages faibles ;
- améliorer une introduction ou conclusion.

Le système ne doit pas inventer de sources ou de références bibliographiques.

Si l’utilisateur demande des citations, références ou faits académiques :
- exiger des sources fournies ;
- ou utiliser une fonction de recherche distincte si le SaaS en possède une ;
- identifier clairement les informations non vérifiées.

---

# 20. Tâches personnalisées

Permettre à l’administrateur de créer des modèles de tâches.

Exemple de table :

```prisma
model AiPromptTemplate {
  id           String   @id @default(cuid())
  tenantId     String?
  slug         String
  name         String
  description  String?
  instructions String
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, slug])
}
```

Le frontend transmet seulement :
- le slug ;
- les entrées utilisateur.

Le backend récupère les instructions réelles.

Cela empêche la modification arbitraire des prompts système sensibles depuis le navigateur.

---

# 21. Endpoint de test de la clé

Créer :

```text
POST /api/admin/ai/openai/test
```

Processus :

1. vérifier rôle administrateur ;
2. accepter soit la nouvelle clé saisie, soit la clé enregistrée ;
3. effectuer un appel minimal ;
4. retourner un statut normalisé ;
5. ne jamais retourner le secret.

Réponse :

```json
{
  "ok": true,
  "provider": "openai",
  "model": "gpt-5.6-terra",
  "message": "Connexion OpenAI réussie."
}
```

En cas d’erreur :

```json
{
  "ok": false,
  "code": "OPENAI_AUTH_ERROR",
  "message": "La clé OpenAI est invalide ou ne possède pas les autorisations nécessaires."
}
```

Ne pas renvoyer les détails bruts susceptibles de contenir des informations sensibles.

---

# 22. Streaming

Le streaming est recommandé pour les longues générations.

Architecture :

```text
Client
  ↓
POST /api/ai/generate-stream
  ↓
Route serveur
  ↓
OpenAI streaming
  ↓
ReadableStream / SSE
  ↓
Éditeur
```

Le bouton doit afficher :

```text
Génération…
```

avec possibilité d’annuler la requête côté client via `AbortController`.

Le backend doit également appliquer ses limites indépendamment du frontend.

---

# 23. Gestion de l’historique

Exemple de modèle :

```prisma
model AiGeneration {
  id              String   @id @default(cuid())
  tenantId        String?
  userId          String
  task            String
  model           String
  promptVersion   String?
  inputChars      Int?
  outputChars     Int?
  inputTokens     Int?
  outputTokens    Int?
  totalTokens     Int?
  status          String
  latencyMs       Int?
  providerRequestId String?
  createdAt       DateTime @default(now())
}
```

Par défaut, ne pas enregistrer les prompts/paroles complets dans les logs techniques.

Si le produit a besoin d’un historique de création :
- le stocker dans une table métier séparée ;
- appliquer les règles de confidentialité du produit ;
- permettre la suppression par l’utilisateur si nécessaire.

---

# 24. Quotas et maîtrise des coûts

Le système doit pouvoir limiter :

- nombre de générations par minute ;
- nombre par jour ;
- tokens par requête ;
- tokens mensuels ;
- fonctions disponibles selon le plan ;
- modèle disponible selon le plan.

Exemple :

```text
FREE
- 5 générations/jour
- modèle économique
- sortie limitée

PRO
- quota supérieur
- modèles supplémentaires
- génération longue

BUSINESS
- quotas tenant
- prompts personnalisés
- historique étendu
```

Ne pas faire confiance au plan envoyé par le frontend. Le récupérer depuis la base de données.

---

# 25. Rate limiting

Appliquer un rate limit au minimum sur :

```text
/api/ai/*
/api/admin/ai/*
```

Clés possibles :

```text
userId
tenantId
IP
```

Préférer une combinaison tenant + utilisateur pour les utilisateurs authentifiés.

Retour standard :

```http
429 Too Many Requests
```

---

# 26. Gestion des erreurs

Créer des codes internes stables :

```text
AI_NOT_CONFIGURED
AI_DISABLED
AI_AUTH_ERROR
AI_RATE_LIMITED
AI_QUOTA_EXCEEDED
AI_INVALID_REQUEST
AI_PROVIDER_ERROR
AI_TIMEOUT
AI_EMPTY_RESPONSE
AI_MODEL_UNAVAILABLE
```

Ne pas exposer les traces internes.

Exemple frontend :

```text
Impossible de générer les paroles pour le moment.
Réessayez dans quelques instants.
```

Dans l’administration, fournir un message plus précis sans divulguer de secret.

---

# 27. Timeout et retry

Ajouter un timeout serveur.

Retry uniquement pour les erreurs temporaires :
- timeout ;
- surcharge ;
- erreurs 5xx appropriées.

Ne pas retry automatiquement :
- clé invalide ;
- requête invalide ;
- quota épuisé ;
- contenu refusé.

Utiliser un backoff limité.

---

# 28. Protection contre les abus

Prévoir :

- authentification ;
- autorisation ;
- limites d’entrée ;
- Zod serveur ;
- rate limiting ;
- quotas ;
- journalisation des événements ;
- identifiant utilisateur interne ;
- détection des rafales de requêtes ;
- blocage temporaire en cas d’abus ;
- plafonds de dépenses au niveau OpenAI.

---

# 29. Confidentialité

L’interface doit expliquer clairement quand du contenu est envoyé au fournisseur IA.

Éviter d’envoyer :
- secrets ;
- mots de passe ;
- clés API ;
- données inutiles ;
- informations internes non nécessaires.

Pour les textes longs, envoyer uniquement le contenu nécessaire à la tâche.

---

# 30. Sécurité multi-tenant

Si le SaaS est multi-tenant :

1. chaque requête doit résoudre le `tenantId` côté serveur ;
2. ne jamais accepter un `tenantId` arbitraire sans contrôle d’appartenance ;
3. une configuration OpenAI d’un tenant ne doit jamais être lisible par un autre ;
4. les requêtes Prisma doivent inclure le scope tenant ;
5. appliquer RLS si la base de données et l’architecture du projet le permettent ;
6. tester explicitement les fuites cross-tenant.

---

# 31. Permissions

Créer au minimum :

```text
ai.use
ai.settings.read
ai.settings.write
ai.prompts.read
ai.prompts.write
ai.usage.read
```

Un utilisateur standard ne doit jamais pouvoir :
- lire la clé API ;
- modifier le fournisseur ;
- modifier le modèle global ;
- augmenter ses quotas.

---

# 32. Design de l’administration

Page :

```text
Paramètres
└── Intelligence artificielle
    ├── OpenAI
    ├── Modèles
    ├── Prompts
    ├── Quotas
    └── Utilisation
```

Carte OpenAI :

```text
OpenAI
Connecté ✓

Clé API
••••••••••••••ABCD

Modèle par défaut
GPT-5.6 Terra

[Tester la connexion] [Modifier]
```

Utilisation :

```text
Aujourd’hui
124 requêtes

Ce mois
2,8 M tokens

Erreurs
0,7 %
```

Ne pas afficher un coût estimé comme une facture officielle. Le nommer explicitement "estimation interne" si calculé localement.

---

# 33. Page de prompts

Permettre à l’admin de modifier certains prompts métier sans modifier le code.

Champs :

```text
Nom
Slug
Description
Instructions
Actif
Version
```

Conserver une version afin de pouvoir relier une génération à la version de prompt utilisée.

Pour les règles de sécurité et les règles système critiques, garder une couche non éditable dans le code serveur.

---

# 34. Versioning des prompts

Exemple :

```ts
const PROMPT_VERSION = "lyrics-v1";
```

Enregistrer la version dans les métriques.

Lors d’une modification importante :

```text
lyrics-v1
lyrics-v2
lyrics-v3
```

Cela facilite les tests A/B et le diagnostic.

---

# 35. Cache

Ne pas mettre en cache aveuglément les générations personnalisées.

Cache possible pour :
- listes de genres ;
- listes de langues ;
- configuration non secrète ;
- prompts publics non sensibles.

Ne jamais stocker la clé API dans un cache frontend.

---

# 36. Tests obligatoires

## Configuration

- sauvegarde d’une clé valide ;
- rejet d’une clé vide lors d’une première configuration ;
- remplacement de clé ;
- suppression ;
- clé masquée après sauvegarde ;
- aucun secret dans la réponse JSON.

## Auth

- utilisateur standard → accès refusé à la configuration ;
- admin autorisé → accès accordé ;
- cross-tenant → accès refusé.

## Génération

- paroles simples ;
- grande entrée ;
- caractères Unicode ;
- français ;
- anglais ;
- langues africaines si demandées ;
- structure personnalisée ;
- contenu non explicite ;
- réécriture d’un extrait ;
- amélioration de texte ;
- amélioration d’une thèse.

## Erreurs

- clé invalide ;
- timeout ;
- rate limit ;
- quota interne dépassé ;
- modèle invalide ;
- réponse vide ;
- OpenAI indisponible.

## Sécurité

Vérifier que la clé n’apparaît jamais dans :
- source HTML ;
- bundle Next.js client ;
- Network response ;
- console navigateur ;
- logs serveur ;
- Git ;
- erreurs Sentry/analytics ;
- captures d’exception.

---

# 37. Test d’intégrité

Avant de déclarer l’intégration terminée :

```text
[ ] npm run lint
[ ] npm run typecheck
[ ] npm run test
[ ] npm run build
[ ] npm audit
[ ] vérification des variables d’environnement
[ ] vérification absence de secret dans Git
[ ] test API OpenAI
[ ] test permissions admin
[ ] test utilisateur normal
[ ] test tenant A ≠ tenant B
[ ] test quotas
[ ] test rate limiting
[ ] test erreurs
[ ] test mobile
[ ] test desktop
```

Si le projet possède déjà ses propres commandes, utiliser celles du repository.

---

# 38. Critères d’acceptation

L’intégration est considérée terminée uniquement si :

1. l’administrateur peut ouvrir la page OpenAI ;
2. il peut saisir une clé ;
3. le backend peut tester cette clé ;
4. la clé est stockée chiffrée ou via un secret manager ;
5. la clé complète n’est jamais renvoyée au navigateur ;
6. l’admin peut sélectionner le modèle ;
7. la génération de paroles fonctionne ;
8. la réécriture fonctionne ;
9. l’amélioration de texte fonctionne ;
10. le mode thèse/document long fonctionne ;
11. les appels sont authentifiés ;
12. Zod valide toutes les entrées côté serveur ;
13. rate limiting et quotas fonctionnent ;
14. les erreurs sont propres ;
15. le build de production réussit ;
16. aucun secret n’est présent dans Git ;
17. les tests cross-tenant passent si le SaaS est multi-tenant.

---

# 39. Comportement du skill lors d’une implémentation

Quand ce skill est invoqué sur un projet existant :

1. analyser la structure du projet avant de créer des fichiers ;
2. identifier Next.js App Router ou Pages Router ;
3. identifier l’auth existante ;
4. identifier Prisma/Drizzle/Supabase/Neon ou autre accès DB ;
5. identifier le système de rôles ;
6. identifier le système de validation Zod ;
7. identifier le rate limiter existant ;
8. réutiliser les composants UI existants ;
9. éviter les doublons ;
10. proposer un plan de modifications ;
11. implémenter ;
12. lancer tests/typecheck/build ;
13. corriger les erreurs ;
14. refaire le test d’intégrité ;
15. fournir la liste finale des fichiers modifiés.

Ne pas remplacer arbitrairement l’architecture existante.

---

# 40. Structure de fichiers recommandée

```text
app/
  api/
    ai/
      generate/
        route.ts
      generate-stream/
        route.ts
    admin/
      ai/
        openai/
          route.ts
          test/
            route.ts

  dashboard/
    settings/
      ai/
        page.tsx

lib/
  ai/
    openai-client.ts
    openai-service.ts
    prompts/
      lyrics.ts
      improve-text.ts
      thesis.ts
    task-router.ts
    types.ts
    errors.ts
    usage.ts

  security/
    encryption.ts

schemas/
  ai.ts
  ai-settings.ts
```

Adapter les chemins au projet réel.

---

# 41. Task router

Toutes les tâches doivent passer par un routeur serveur :

```ts
export async function executeAiTask(task: AiTask, context: AiContext) {
  switch (task.task) {
    case "lyrics.generate":
      return generateLyrics(task.input, context);

    case "lyrics.rewrite":
      return rewriteLyrics(task.input, context);

    case "text.improve":
      return improveText(task.input, context);

    case "thesis.improve":
      return improveThesis(task.input, context);

    case "custom":
      return executeCustomTask(task.input, context);

    default:
      throw new Error("AI_INVALID_REQUEST");
  }
}
```

Cela évite de créer un endpoint complètement différent pour chaque bouton.

---

# 42. Génération de paroles structurées

Lorsque l’interface a besoin d’un résultat structuré, normaliser le résultat en :

```ts
type LyricsResult = {
  title: string;
  language: string;
  genre?: string;
  sections: Array<{
    type: "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro";
    label: string;
    text: string;
  }>;
};
```

Le backend peut demander une sortie JSON structurée lorsque cela est utile et validable.

Toujours valider la sortie structurée avant de l’enregistrer.

---

# 43. Historique et versions des paroles

Fonctionnalité recommandée :

```text
Song
└── LyricsVersion
    ├── v1
    ├── v2
    ├── v3
```

Actions :

- restaurer une version ;
- comparer ;
- dupliquer ;
- renommer ;
- supprimer.

Ne pas écraser silencieusement une version que l’utilisateur souhaite conserver.

---

# 44. Prompt injection

Considérer tout texte utilisateur comme non fiable.

Le contenu utilisateur ne doit pas pouvoir :
- modifier les permissions serveur ;
- demander la clé API ;
- désactiver les quotas ;
- changer le tenant ;
- exécuter du code serveur ;
- lire les secrets.

Les règles de sécurité doivent être appliquées par le code, pas uniquement par le prompt.

---

# 45. Observabilité

Mesurer :

```text
request count
success rate
error rate
latency
model
task
input tokens
output tokens
total tokens
tenant
plan
```

Ne jamais inclure la clé API dans la télémétrie.

Éviter également d’envoyer automatiquement le contenu des chansons dans des outils tiers d’analytics.

---

# 46. Bouton “Tester OpenAI”

Le bouton doit :

1. désactiver temporairement le bouton pendant la requête ;
2. afficher un loader ;
3. appeler l’endpoint serveur ;
4. afficher :
   - succès vert ;
   - erreur contrôlée ;
5. ne jamais afficher la clé ;
6. ne jamais appeler OpenAI directement depuis le browser.

---

# 47. Suppression de la clé

Lorsqu’un admin clique sur “Supprimer la clé” :

- demander confirmation ;
- supprimer les champs chiffrés ;
- conserver éventuellement l’historique non sensible ;
- passer le statut à “Non configuré” ;
- ne plus autoriser les générations utilisant cette configuration ;
- utiliser la variable d’environnement uniquement si cette stratégie de fallback est explicitement activée.

---

# 48. Rotation de clé

Prévoir un workflow :

```text
Remplacer la clé
→ saisir nouvelle clé
→ tester nouvelle clé
→ si valide : chiffrer et enregistrer
→ invalider l’ancienne configuration locale
→ afficher le nouveau suffixe
```

Ne pas supprimer une clé OpenAI distante automatiquement sauf si le projet utilise une API OpenAI autorisée à le faire et que cette action est explicitement voulue.

---

# 49. Environnements

Utiliser des configurations séparées pour :

```text
development
staging
production
```

Éviter qu’un test de staging consomme les mêmes quotas ou secrets que la production lorsque l’infrastructure permet de les séparer.

---

# 50. Règles finales

- API OpenAI côté serveur uniquement.
- Responses API comme voie d’intégration principale.
- Clé API sécurisée.
- Zod côté serveur.
- UI admin pour configurer et tester.
- Modèle configurable.
- Prompts versionnés.
- Génération de paroles optimisée.
- Réécriture et amélioration intégrées.
- Documents/thèses supportés.
- Quotas et rate limiting.
- Multi-tenant sécurisé.
- Logs sans secrets.
- Tests avant production.
- Pas de duplication inutile de l’architecture existante.
- Toute nouvelle fonctionnalité doit conserver la compatibilité avec le site existant.

---

# Références officielles

- Documentation OpenAI : https://platform.openai.com/docs
- Modèles : https://platform.openai.com/docs/models
- API Reference : https://platform.openai.com/docs/api-reference
- Sécurité des clés API : https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
