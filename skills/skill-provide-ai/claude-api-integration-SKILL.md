---
name: claude-api-integration
description: >
  Intègre l'API Claude d'Anthropic dans un SaaS Next.js pour générer, améliorer,
  reformuler et analyser du texte, avec un usage prioritaire pour la création de
  paroles de musique. Inclut une interface d'administration permettant de saisir,
  tester, chiffrer, modifier et désactiver une clé API Claude, de choisir le modèle,
  de définir les limites de tokens, de gérer les prompts, les journaux d'utilisation,
  les erreurs et les quotas. À utiliser lorsqu'un projet doit connecter
  platform.claude.com / api.anthropic.com à un site ou SaaS.
---

# Skill — Intégration Claude API pour SaaS de génération de paroles

## 1. Objectif

Ce skill doit permettre à un agent de développement de connecter proprement l'API
Claude d'Anthropic à un SaaS Next.js, sans exposer la clé API dans le navigateur.

Cas d'usage principaux :

- Génération de paroles de chansons.
- Amélioration et réécriture de paroles existantes.
- Création de variantes de couplets, refrains, ponts et introductions.
- Correction grammaticale et stylistique.
- Traduction et adaptation de paroles.
- Résumé, reformulation et amélioration de textes.
- Aide à la rédaction académique : clarification, restructuration, amélioration du style,
  synthèse et relecture de thèses ou documents longs.
- Génération de titres, descriptions, idées, plans, slogans et contenus éditoriaux.
- Conversations ou assistants texte internes au SaaS.

Le skill doit être compatible en priorité avec :

- Next.js App Router.
- TypeScript.
- Prisma.
- Zod.
- Vercel ou hébergement Node.js équivalent.
- Une architecture SaaS multi-utilisateur ou multi-tenant.

---

## 2. Règle fondamentale de sécurité

NE JAMAIS appeler l'API Claude directement depuis le navigateur avec la vraie clé API.

La clé Claude :

- doit rester exclusivement côté serveur ;
- ne doit jamais être insérée dans un composant React client ;
- ne doit jamais être envoyée dans le HTML ;
- ne doit jamais apparaître dans les logs ;
- ne doit jamais être enregistrée en clair dans la base de données ;
- ne doit jamais être incluse dans une réponse API ;
- ne doit jamais être préfixée par `NEXT_PUBLIC_`.

Le SDK Anthropic désactive d'ailleurs par défaut l'utilisation directe dans le navigateur
afin d'éviter l'exposition des identifiants secrets.

---

## 3. Source officielle de la clé API

La clé API est créée depuis Claude Console / Claude Platform :

1. Ouvrir `https://platform.claude.com/`.
2. Aller dans `Settings`.
3. Ouvrir `API keys`.
4. Cliquer sur `Create key`.
5. Choisir le type de clé, le workspace si nécessaire et l'expiration.
6. Copier la clé.
7. Coller la clé uniquement dans l'interface d'administration sécurisée du SaaS.

L'API REST Claude est disponible à :

`https://api.anthropic.com`

L'API principale de génération est :

`POST /v1/messages`

Le SDK TypeScript officiel est :

`@anthropic-ai/sdk`

Installation :

```bash
npm install @anthropic-ai/sdk
```

---

## 4. Authentification

Pour les appels HTTP directs, utiliser de préférence :

```http
Authorization: Bearer CLAUDE_API_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

`x-api-key` reste pris en charge par Anthropic comme méthode héritée.

Avec le SDK TypeScript officiel, le SDK gère les en-têtes nécessaires.

Exemple :

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

Dans ce skill, lorsque la clé vient du tableau de bord et est stockée chiffrée en base,
elle doit être déchiffrée côté serveur puis passée au constructeur :

```ts
const client = new Anthropic({
  apiKey: decryptedApiKey,
});
```

---

## 5. Modèles

Ne pas figer l'application sur un seul modèle pour toujours.

Prévoir une configuration administrateur `defaultModel`.

Exemples de modèles Claude actuels pouvant être proposés dans une liste configurable :

```ts
export const CLAUDE_MODELS = ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"] as const;
```

Recommandation fonctionnelle pour ce SaaS :

- `claude-sonnet-5` : bon choix général pour génération et amélioration de paroles.
- `claude-haiku-4-5-20251001` : tâches rapides et économiques.
- `claude-opus-5` : tâches complexes, documents longs et besoins exigeants.

IMPORTANT :
Les identifiants de modèles évoluent. L'agent doit vérifier la documentation officielle
Anthropic avant toute mise à jour majeure et permettre à l'administrateur de saisir
manuellement un ID de modèle si nécessaire.

Ne pas dépendre de `temperature`, `top_k` ou `top_p` pour les nouveaux modèles :
Anthropic a déprécié ces paramètres pour plusieurs modèles récents.

---

## 6. Architecture recommandée

```text
Utilisateur
   |
   v
Interface Next.js
   |
   v
POST /api/ai/claude/generate
   |
   +--> Authentification utilisateur
   +--> Autorisation / quota
   +--> Validation Zod
   +--> Chargement config Claude
   +--> Déchiffrement clé API
   +--> Construction du prompt système
   +--> Anthropic SDK
   +--> Claude Messages API
   +--> Journal usage/coût
   |
   v
Réponse sécurisée vers le navigateur
```

Administration :

```text
Administrateur
   |
   v
Paramètres > IA > Claude
   |
   +--> saisir clé API
   +--> tester connexion
   +--> choisir modèle
   +--> choisir max tokens
   +--> activer/désactiver Claude
   +--> choisir Claude comme fournisseur par défaut
   +--> consulter statut
   +--> consulter usage
```

---

## 7. Interface d'administration Claude

Créer une page de tableau de bord, par exemple :

`/dashboard/settings/ai/claude`

ou :

`/admin/settings/integrations/claude`

### Champs

Afficher :

- Statut : connecté / non configuré / erreur.
- Champ `API Key`.
- Bouton afficher/masquer pendant la saisie uniquement.
- Clé enregistrée affichée sous forme masquée :
  `sk-ant-••••••••••••abcd`
- `Default model`.
- `Max output tokens`.
- Workspace ID facultatif.
- Activation/désactivation Claude.
- Fournisseur par défaut oui/non.
- Bouton `Enregistrer`.
- Bouton `Tester la connexion`.
- Bouton `Supprimer la clé`.
- Date du dernier test réussi.
- Dernier message d'erreur, sans révéler de secret.

### Important

Après sauvegarde, NE JAMAIS renvoyer la clé complète à l'interface.

Réponse d'exemple :

```json
{
  "configured": true,
  "enabled": true,
  "maskedKey": "sk-ant-••••••••abcd",
  "defaultModel": "claude-sonnet-5",
  "lastTestedAt": "..."
}
```

---

## 8. Validation Zod — paramètres administrateur

```ts
import { z } from "zod";

export const claudeSettingsSchema = z.object({
  apiKey: z.string().trim().min(20).max(500).optional(),
  enabled: z.boolean(),
  defaultModel: z.string().trim().min(3).max(150),
  maxTokens: z.number().int().min(64).max(128000),
  workspaceId: z.string().trim().max(200).optional().nullable(),
});
```

Ne pas considérer le préfixe de clé comme une validation de sécurité suffisante.
La vraie validation consiste à effectuer un appel serveur contrôlé à Claude.

---

## 9. Stockage de configuration avec Prisma

Exemple de modèle :

```prisma
model AiProviderConfig {
  id                 String   @id @default(cuid())
  tenantId           String?
  provider           String
  enabled            Boolean  @default(false)
  encryptedApiKey    String?
  apiKeyIv           String?
  apiKeyAuthTag      String?
  keyLast4           String?
  defaultModel       String?
  maxTokens          Int      @default(4096)
  workspaceId        String?
  lastTestedAt       DateTime?
  lastTestSuccess    Boolean?
  lastErrorCode      String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, provider])
  @@index([provider])
}
```

Pour une application mono-tenant, `tenantId` peut être supprimé.

Provider attendu :

```text
anthropic
```

ou :

```text
claude
```

Choisir une convention unique dans tout le projet.

---

## 10. Chiffrement de la clé API

Créer une variable serveur dédiée :

```env
AI_SECRETS_ENCRYPTION_KEY=
```

Elle doit :

- rester dans les variables d'environnement du serveur ;
- ne jamais être stockée dans la base ;
- ne jamais être commitée dans Git ;
- posséder une entropie suffisante.

Exemple AES-256-GCM :

```ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const raw = process.env.AI_SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("AI_SECRETS_ENCRYPTION_KEY is missing");
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(data: { encrypted: string; iv: string; authTag: string }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(data.iv, "base64"));

  decipher.setAuthTag(Buffer.from(data.authTag, "base64"));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(data.encrypted, "base64")), decipher.final()]);

  return decrypted.toString("utf8");
}
```

Pour une infrastructure plus avancée, préférer un véritable secret manager/KMS.

---

## 11. Client Claude côté serveur

Créer :

`lib/ai/providers/claude.ts`

```ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export function createClaudeClient(apiKey: string) {
  if (!apiKey) {
    throw new Error("Claude API key is missing");
  }

  return new Anthropic({
    apiKey,
  });
}
```

Ne pas exporter ce module vers des composants client.

---

## 12. Extraction sûre du texte retourné

La propriété `content` d'une réponse Claude est composée de blocs.

```ts
export function extractClaudeText(message: Awaited<ReturnType<Anthropic["messages"]["create"]>>) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
```

Adapter le typage si nécessaire à la version installée du SDK.

---

## 13. Types de tâches supportées

Créer une union stricte :

```ts
export const claudeTaskSchema = z.enum([
  "lyrics_generate",
  "lyrics_improve",
  "lyrics_rewrite",
  "lyrics_extend",
  "lyrics_translate",
  "lyrics_structure",
  "title_generate",
  "text_improve",
  "text_rewrite",
  "text_summarize",
  "thesis_improve",
  "thesis_outline",
  "thesis_proofread",
  "general",
]);
```

Le front-end ne doit pas pouvoir envoyer arbitrairement un prompt système privilégié.

---

## 14. Schéma de génération

```ts
export const claudeGenerateSchema = z.object({
  task: claudeTaskSchema,
  prompt: z.string().trim().min(1).max(30000),
  language: z.string().trim().min(2).max(50).default("français"),
  genre: z.string().trim().max(100).optional(),
  mood: z.string().trim().max(100).optional(),
  theme: z.string().trim().max(500).optional(),
  audience: z.string().trim().max(200).optional(),
  instructions: z.string().trim().max(3000).optional(),
});
```

Pour des documents longs, définir une route et des limites dédiées plutôt que d'augmenter
sans contrôle la taille du champ principal.

---

## 15. Prompts système — paroles de musique

Créer les prompts côté serveur.

Exemple :

```ts
const SYSTEM_PROMPTS = {
  lyrics_generate: `
Tu es un assistant spécialisé dans la création de paroles originales de chansons.
Tu produis des paroles nouvelles en respectant le genre musical, le thème, l'ambiance,
la langue et la structure demandés.
Évite de reproduire ou d'imiter trop étroitement des paroles protégées existantes.
Structure clairement Intro, Couplet, Pré-refrain, Refrain, Pont et Outro lorsque pertinent.
Ne prétends pas qu'un texte généré est l'œuvre d'un artiste réel.
`.trim(),

  lyrics_improve: `
Tu es un éditeur de paroles de chansons.
Améliore le rythme, la fluidité, les rimes, la cohérence et l'impact émotionnel
du texte fourni tout en conservant son intention.
`.trim(),

  thesis_improve: `
Tu es un assistant de rédaction académique.
Améliore la clarté, la structure, la cohérence et la qualité rédactionnelle
du passage fourni sans inventer de sources, données, citations ou résultats.
Signale explicitement lorsqu'une affirmation nécessite une vérification ou une source.
`.trim(),
};
```

L'utilisateur doit pouvoir choisir le style, le genre, le thème et la langue,
mais les instructions de sécurité et d'intégrité doivent rester contrôlées côté serveur.

---

## 16. Construction du prompt utilisateur

Exemple pour les paroles :

```ts
function buildLyricsPrompt(input: {
  prompt: string;
  language: string;
  genre?: string;
  mood?: string;
  theme?: string;
  audience?: string;
  instructions?: string;
}) {
  return [
    `Langue : ${input.language}`,
    input.genre ? `Genre : ${input.genre}` : null,
    input.mood ? `Ambiance : ${input.mood}` : null,
    input.theme ? `Thème : ${input.theme}` : null,
    input.audience ? `Public : ${input.audience}` : null,
    input.instructions ? `Instructions : ${input.instructions}` : null,
    "",
    "Demande :",
    input.prompt,
  ]
    .filter(Boolean)
    .join("\n");
}
```

---

## 17. Route de génération Next.js

Créer :

`app/api/ai/claude/generate/route.ts`

Pseudo-implémentation :

```ts
import { NextResponse } from "next/server";
import { claudeGenerateSchema } from "@/lib/validators/claude";
import { createClaudeClient } from "@/lib/ai/providers/claude";

export async function POST(request: Request) {
  try {
    // 1. Authentifier l'utilisateur
    // 2. Vérifier tenant + permissions
    // 3. Vérifier rate limit / crédits / abonnement

    const body = await request.json();
    const input = claudeGenerateSchema.parse(body);

    // 4. Charger la configuration Claude depuis la base
    const config = await getClaudeConfigForCurrentTenant();

    if (!config?.enabled) {
      return NextResponse.json({ error: "CLAUDE_DISABLED" }, { status: 503 });
    }

    // 5. Déchiffrer la clé UNIQUEMENT ici, côté serveur
    const apiKey = decryptStoredClaudeKey(config);
    const client = createClaudeClient(apiKey);

    // 6. Construire le prompt système selon la tâche
    const system = getClaudeSystemPrompt(input.task);
    const userPrompt = buildUserPrompt(input);

    // 7. Appeler Claude
    const message = await client.messages.create({
      model: config.defaultModel || "claude-sonnet-5",
      max_tokens: config.maxTokens || 4096,
      system,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // 8. Enregistrer uniquement les métadonnées utiles
    await logAiUsage({
      provider: "anthropic",
      model: message.model,
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      success: true,
    });

    return NextResponse.json({
      text,
      model: message.model,
      usage: message.usage,
    });
  } catch (error) {
    return handleClaudeApiError(error);
  }
}
```

Adapter les helpers aux mécanismes Auth/Prisma déjà présents dans le SaaS.

---

## 18. Test de connexion depuis le tableau de bord

Créer :

`POST /api/admin/integrations/claude/test`

Le test doit :

1. être réservé aux administrateurs autorisés ;
2. valider le corps avec Zod ;
3. tester soit la nouvelle clé saisie, soit la clé déjà enregistrée ;
4. faire un appel minimal à Claude ;
5. retourner un statut générique ;
6. ne jamais retourner la clé.

Exemple logique :

```ts
const response = await client.messages.create({
  model,
  max_tokens: 16,
  messages: [
    {
      role: "user",
      content: "Reply with OK.",
    },
  ],
});
```

Réponse :

```json
{
  "success": true,
  "model": "claude-sonnet-5"
}
```

En cas d'échec :

```json
{
  "success": false,
  "code": "AUTHENTICATION_FAILED",
  "message": "La connexion à Claude a échoué."
}
```

Ne jamais renvoyer une réponse brute susceptible de contenir des informations internes.

---

## 19. Enregistrement des paramètres

Créer :

`PUT /api/admin/integrations/claude`

Règles :

- Auth admin obligatoire.
- Validation Zod.
- Si `apiKey` est absente, conserver la clé existante.
- Si une nouvelle clé est fournie, la chiffrer avant Prisma.
- Stocker uniquement les quatre derniers caractères séparément pour l'affichage.
- Journaliser l'action d'administration sans journaliser le secret.
- Invalider le cache de configuration après modification.

---

## 20. Suppression / rotation d'une clé

Créer :

`DELETE /api/admin/integrations/claude/key`

Effacer :

- `encryptedApiKey`
- `apiKeyIv`
- `apiKeyAuthTag`
- `keyLast4`

Puis :

- désactiver l'intégration ;
- invalider les caches ;
- écrire un audit log.

La suppression locale ne supprime pas automatiquement la clé dans Claude Console.
L'administrateur doit également désactiver ou supprimer la clé compromise côté Anthropic.

---

## 21. Interface de génération de paroles

Prévoir un formulaire utilisateur avec :

- Description / idée de chanson.
- Thème.
- Genre musical.
- Ambiance.
- Langue.
- Structure souhaitée.
- Nombre approximatif de couplets.
- Refrain oui/non.
- Public cible facultatif.
- Instructions supplémentaires.
- Bouton `Générer`.
- Bouton `Améliorer`.
- Bouton `Créer une autre version`.
- Bouton `Raccourcir`.
- Bouton `Allonger`.
- Bouton `Traduire`.
- Bouton `Copier`.

La réponse doit être affichée progressivement avec streaming si l'expérience utilisateur le justifie.

---

## 22. Streaming

Le SDK TypeScript officiel prend en charge le streaming SSE.

Pour une application de génération de paroles, le streaming est recommandé afin que
l'utilisateur voie le texte apparaître progressivement.

Implémenter le streaming uniquement côté serveur, puis relayer le flux au navigateur.

Prévoir :

- bouton `Arrêter` ;
- état `Génération...` ;
- désactivation des doubles soumissions ;
- gestion de déconnexion ;
- timeout serveur ;
- gestion des requêtes annulées.

---

## 23. Usage et journalisation

Créer une table d'usage :

```prisma
model AiUsageLog {
  id           String   @id @default(cuid())
  tenantId     String?
  userId       String?
  provider     String
  model        String?
  task         String?
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  success      Boolean
  errorCode    String?
  latencyMs    Int?
  createdAt    DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([userId, createdAt])
  @@index([provider, createdAt])
}
```

Ne jamais enregistrer :

- la clé API ;
- les headers d'authentification ;
- les secrets d'environnement.

Pour les contenus utilisateurs, respecter la politique de confidentialité du SaaS
et éviter de journaliser le prompt complet lorsque cela n'est pas nécessaire.

---

## 24. Quotas et anti-abus

Avant chaque appel :

- vérifier l'utilisateur ;
- vérifier le tenant ;
- vérifier son abonnement ;
- vérifier les crédits IA ;
- vérifier une limite par minute ;
- vérifier une limite quotidienne si nécessaire ;
- limiter la taille du prompt ;
- limiter `max_tokens`.

Exemple :

```text
FREE      -> quota très limité
STARTER   -> quota standard
PRO       -> quota supérieur
ADMIN     -> limites internes configurables
```

Ne pas laisser le navigateur choisir librement un nombre arbitraire de tokens.

---

## 25. Comptage de tokens

Claude fournit une API de comptage de tokens.

Utiliser cette fonctionnalité lorsque nécessaire pour :

- estimer la taille d'un document ;
- prévenir les entrées trop volumineuses ;
- calculer des crédits internes ;
- améliorer l'expérience avant envoi.

Ne pas confondre estimation de crédits SaaS et facturation réelle Anthropic.

---

## 26. Documents longs et thèses

Pour les thèses :

1. ne pas envoyer automatiquement un document immense en un seul prompt ;
2. découper le document par sections si nécessaire ;
3. conserver le contexte utile ;
4. proposer des tâches distinctes :
   - correction ;
   - restructuration ;
   - résumé ;
   - amélioration du style ;
   - vérification de cohérence ;
   - génération d'un plan ;
5. ne jamais inventer de références bibliographiques ;
6. signaler les passages demandant une vérification factuelle ;
7. éventuellement utiliser le prompt caching pour les gros contextes répétitifs.

Le prompt caching de Claude peut réduire la latence et le coût pour les contextes
répétés et volumineux.

---

## 27. Gestion multi-fournisseurs IA

Si le projet possède aussi OpenAI, Grok ou d'autres fournisseurs, créer une abstraction.

```ts
export type AiProvider = "openai" | "anthropic" | "xai";

export interface GenerateTextInput {
  task: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  provider: AiProvider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}
```

Puis :

```ts
generateWithOpenAI(...)
generateWithClaude(...)
generateWithGrok(...)
```

et :

```ts
generateText({
  provider,
  ...
});
```

Ainsi, le SaaS peut permettre à l'administrateur de choisir :

- fournisseur par défaut ;
- fournisseur par tâche ;
- fallback éventuel ;
- modèle par fournisseur.

Ne jamais faire un fallback automatique vers un autre fournisseur sans respecter
les règles de coût, confidentialité et consentement prévues par le SaaS.

---

## 28. Gestion des erreurs Claude

Mapper les erreurs vers des codes internes.

Exemples :

```text
CLAUDE_NOT_CONFIGURED
CLAUDE_DISABLED
CLAUDE_AUTHENTICATION_FAILED
CLAUDE_RATE_LIMITED
CLAUDE_BAD_REQUEST
CLAUDE_MODEL_NOT_AVAILABLE
CLAUDE_TIMEOUT
CLAUDE_UPSTREAM_ERROR
CLAUDE_UNKNOWN_ERROR
```

Ne jamais afficher directement une stack trace au client.

Gérer notamment :

- 400 : requête incorrecte ;
- 401 : authentification invalide ou clé expirée ;
- 403 : autorisation ;
- 404 : ressource/modèle non disponible ;
- 429 : rate limit ;
- 5xx : erreur fournisseur.

Prévoir retry avec backoff uniquement pour les erreurs transitoires appropriées.
Ne pas répéter automatiquement une erreur 401.

---

## 29. Timeout

Ajouter un délai maximum côté serveur.

Exemple :

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60_000);

try {
  // appel API compatible AbortSignal
} finally {
  clearTimeout(timeout);
}
```

Adapter aux possibilités exactes de la version du SDK installée.

---

## 30. Protection CSRF / permissions / session

Les routes d'administration doivent obligatoirement vérifier :

- session valide ;
- rôle autorisé ;
- tenant courant ;
- contrôle d'accès serveur ;
- éventuellement protection CSRF selon l'architecture d'authentification.

Ne jamais cacher uniquement le bouton dans le front-end :
la permission doit être revérifiée dans la route serveur.

---

## 31. Audit log administrateur

Journaliser les actions suivantes :

```text
CLAUDE_SETTINGS_UPDATED
CLAUDE_API_KEY_ADDED
CLAUDE_API_KEY_ROTATED
CLAUDE_API_KEY_REMOVED
CLAUDE_CONNECTION_TESTED
CLAUDE_ENABLED
CLAUDE_DISABLED
CLAUDE_DEFAULT_MODEL_CHANGED
```

Journaliser :

- userId administrateur ;
- tenantId ;
- action ;
- date ;
- résultat.

Ne jamais journaliser la clé elle-même.

---

## 32. Variables d'environnement

Exemple :

```env
# Utilisé si l'intégration est configurée manuellement.
ANTHROPIC_API_KEY=

# Obligatoire si la clé est stockée chiffrée depuis le dashboard.
AI_SECRETS_ENCRYPTION_KEY=
```

`.env.local` doit être ignoré par Git.

Vérifier :

```gitignore
.env
.env.local
.env.*.local
```

Ne jamais ajouter une vraie clé dans un fichier d'exemple.

Dans `.env.example` :

```env
ANTHROPIC_API_KEY=
AI_SECRETS_ENCRYPTION_KEY=
```

---

## 33. Mode configuration par dashboard vs variable d'environnement

Le skill doit supporter deux stratégies.

### Mode A — Dashboard

Prioritaire lorsque l'administrateur doit saisir la clé depuis le SaaS.

```text
Dashboard -> chiffrement -> base de données -> déchiffrement serveur -> Claude
```

### Mode B — Variable d'environnement

Pour une configuration technique administrée par l'équipe :

```text
ANTHROPIC_API_KEY -> serveur -> Claude
```

Ordre recommandé :

1. config tenant chiffrée si présente ;
2. sinon variable d'environnement si l'application l'autorise ;
3. sinon `CLAUDE_NOT_CONFIGURED`.

---

## 34. Sélection du fournisseur dans le dashboard

Pour un SaaS ayant plusieurs IA, créer :

`Paramètres > Intelligence artificielle`

Cartes :

```text
OpenAI      Connecté
Claude      Connecté
Grok        Non configuré
```

Pour Claude :

```text
[ Activer Claude ]

Clé API
[ sk-ant-••••••••••••abcd ] [Remplacer]

Modèle par défaut
[ Claude Sonnet 5        v ]

Max tokens
[ 4096 ]

Workspace ID
[ facultatif ]

[ Tester la connexion ]   [ Enregistrer ]
```

Ajouter éventuellement :

```text
Fournisseur par défaut pour :
[✓] Génération de paroles
[✓] Amélioration de paroles
[ ] Résumé
[ ] Documents longs
```

---

## 35. Endpoints recommandés

```text
GET    /api/admin/integrations/claude
PUT    /api/admin/integrations/claude
POST   /api/admin/integrations/claude/test
DELETE /api/admin/integrations/claude/key

POST   /api/ai/claude/generate
POST   /api/ai/claude/count-tokens
```

Si une couche multi-provider existe :

```text
POST /api/ai/generate
```

avec sélection serveur du provider.

---

## 36. Tests obligatoires

### Tests unitaires

Tester :

- validation Zod ;
- chiffrement/déchiffrement ;
- masquage de clé ;
- construction des prompts ;
- mapping d'erreurs ;
- extraction du texte ;
- sélection du modèle ;
- permissions.

### Tests d'intégration

Tester :

1. clé correcte ;
2. clé incorrecte ;
3. clé absente ;
4. Claude désactivé ;
5. modèle invalide ;
6. prompt vide ;
7. prompt trop long ;
8. quota dépassé ;
9. 429 simulé ;
10. timeout ;
11. utilisateur non connecté ;
12. utilisateur non admin sur route admin ;
13. clé jamais visible dans les réponses ;
14. clé jamais visible dans les logs ;
15. génération de paroles ;
16. amélioration de paroles ;
17. amélioration d'un texte académique ;
18. passage d'un provider à Claude.

### Test de sécurité

Rechercher dans le build :

```bash
grep -R "sk-ant-" .next 2>/dev/null
```

Une vraie clé ne doit jamais apparaître.

Rechercher également toute utilisation de :

```text
NEXT_PUBLIC_ANTHROPIC
dangerouslyAllowBrowser
```

`dangerouslyAllowBrowser: true` est interdit pour cette architecture.

---

## 37. Critères d'acceptation

L'intégration est terminée uniquement si :

- [ ] Le SDK Anthropic est installé.
- [ ] La clé Claude peut être saisie dans le dashboard.
- [ ] La clé est chiffrée côté serveur.
- [ ] La clé complète n'est jamais renvoyée au navigateur.
- [ ] La connexion peut être testée.
- [ ] Claude peut être activé/désactivé.
- [ ] Le modèle par défaut est configurable.
- [ ] Le `maxTokens` est configurable et borné.
- [ ] Toutes les entrées sont validées avec Zod.
- [ ] Les routes vérifient auth + rôle + tenant.
- [ ] La génération de paroles fonctionne.
- [ ] L'amélioration de paroles fonctionne.
- [ ] Les tâches texte génériques fonctionnent.
- [ ] Les tâches d'amélioration de thèse fonctionnent.
- [ ] Les erreurs Claude sont converties en erreurs applicatives propres.
- [ ] Les usages tokens sont journalisés.
- [ ] Les secrets ne sont jamais loggés.
- [ ] Les quotas/rate limits internes sont appliqués.
- [ ] Les tests unitaires et d'intégration passent.
- [ ] Le build Next.js passe.
- [ ] `npm audit` est contrôlé.
- [ ] Aucun secret n'est commité dans Git.

---

## 38. Ordre d'implémentation recommandé

1. Installer `@anthropic-ai/sdk`.
2. Ajouter schémas Zod.
3. Ajouter modèle Prisma `AiProviderConfig`.
4. Ajouter migration Prisma.
5. Créer chiffrement des secrets.
6. Créer `createClaudeClient`.
7. Créer service de configuration Claude.
8. Créer route admin GET.
9. Créer route admin PUT.
10. Créer route de test.
11. Créer suppression/rotation de clé.
12. Créer prompts système.
13. Créer `/api/ai/claude/generate`.
14. Ajouter quotas/rate limiting.
15. Ajouter `AiUsageLog`.
16. Créer écran dashboard Claude.
17. Connecter l'écran de génération de paroles.
18. Ajouter streaming si nécessaire.
19. Ajouter tests.
20. Effectuer contrôle sécurité.
21. Effectuer build de production.
22. Tester en staging avant production.

---

## 39. Instructions à l'agent de code

Lorsqu'on invoque ce skill, l'agent doit :

1. inspecter l'architecture existante avant de créer de nouveaux fichiers ;
2. réutiliser les systèmes Auth, Prisma, Zod, rate limiting, logs et UI déjà présents ;
3. éviter les duplications ;
4. ne pas casser les fournisseurs IA existants ;
5. conserver la compatibilité desktop et mobile ;
6. ne jamais déplacer de secret vers le client ;
7. valider toutes les entrées avec Zod côté serveur ;
8. effectuer les migrations Prisma proprement ;
9. lancer les tests pertinents ;
10. lancer le typecheck ;
11. lancer le lint ;
12. lancer le build ;
13. corriger les erreurs introduites ;
14. produire un récapitulatif des fichiers créés/modifiés ;
15. indiquer clairement les variables d'environnement à ajouter ;
16. ne jamais afficher de vraie clé API dans son rapport.

---

## 40. Commande suggérée pour invoquer le skill

Exemples :

```text
/claude-api
```

```text
Utilise le skill claude-api-integration pour connecter Claude à ce SaaS.
Ajoute l'écran administrateur, le stockage chiffré de la clé, le test de connexion,
la sélection du modèle et la génération de paroles.
```

Pour une refactorisation multi-provider :

```text
Utilise claude-api-integration et intègre Claude dans notre couche IA existante
sans casser OpenAI ou Grok. Réutilise les composants actuels et applique Zod,
auth serveur, rate limiting, chiffrement des secrets et journalisation des usages.
```

---

## 41. Références officielles Anthropic

Documentation principale :

- https://platform.claude.com/docs/
- https://platform.claude.com/docs/en/api/overview
- https://platform.claude.com/docs/en/manage-claude/authentication
- https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript
- https://platform.claude.com/docs/en/api/typescript/messages
- https://platform.claude.com/docs/en/models/overview
- https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching

Avant une mise à jour importante, vérifier les identifiants de modèles, paramètres
supportés, limites et méthodes d'authentification dans la documentation officielle.
