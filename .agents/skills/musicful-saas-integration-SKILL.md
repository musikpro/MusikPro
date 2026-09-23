# Musicful API Integration Skill for SaaS

## Purpose

This skill integrates the Musicful AI Music API into a production SaaS, with a secure owner/admin dashboard for configuring the Musicful API key and related settings without exposing secrets to end users or client-side code.

Primary goals:

- Let the SaaS owner enter and manage the Musicful API key from the admin dashboard.
- Keep the API key encrypted at rest and server-side only.
- Provide a “Test connection” action.
- Show Musicful API key status, remaining music credits/rights, account email, key name, activation/use dates when available.
- Generate music from prompts and/or lyrics.
- Support instrumental generation.
- Support singer gender selection when supported by the chosen request mode.
- Support Musicful model selection.
- Track asynchronous music-generation tasks.
- Store generated track metadata in the SaaS database.
- Support WAV and MP4 conversion.
- Support Musicful lyrics generation.
- Support Musicful “vibe” generation for a song.
- Add robust Zod validation, audit logging, rate limiting, retries, timeouts, and safe error handling.
- Preserve the existing application architecture and avoid regressions.

---

# 1. Official Musicful API Facts

Base URL:

```text
https://api.musicful.ai
```

Authentication header:

```http
x-api-key: YOUR_MUSICFUL_API_KEY
```

The API key must NEVER be exposed in browser/client-side code.

Known official endpoints:

```text
GET  /v1/get_api_key_info
POST /v1/lyrics
POST /v1/music/generate
GET  /v1/music/tasks
POST /v1/music/generate-vibe
POST /v1/music/generate-wav
POST /v1/music/generate-mp4
```

Music generation endpoint:

```http
POST https://api.musicful.ai/v1/music/generate
```

Task polling endpoint:

```http
GET https://api.musicful.ai/v1/music/tasks?ids=TASK_ID_OR_IDS
```

Lyrics generation endpoint:

```http
POST https://api.musicful.ai/v1/lyrics
```

API key information endpoint:

```http
GET https://api.musicful.ai/v1/get_api_key_info
```

---

# 2. Supported Musicful Models

Current documented values:

```text
MFV3.0
MFV2.0
MFV1.5X
MFV1.5
MFV1.0
```

Recommended default:

```text
MFV3.0
```

Fallback default:

```text
MFV2.0
```

Documented capabilities:

- MFV3.0: up to 8 minutes, lyrics input up to 5,000 words.
- MFV2.0: up to 8 minutes, lyrics input up to 5,000 words.
- MFV1.5X: up to 8 minutes, lyrics input up to 5,000 words.
- MFV1.5: up to 8 minutes, lyrics input up to 5,000 words.
- MFV1.0: up to 4 minutes, lyrics input up to 3,000 words.

Do not hardcode assumptions beyond the official values. Keep the model list configurable in the owner dashboard so future Musicful models can be added without code changes.

---

# 3. Admin Dashboard: Musicful Settings

Create a protected page accessible only to the SaaS owner/super-admin:

```text
Settings
  └── AI Providers
       └── Musicful
```

Recommended route:

```text
/admin/settings/ai-providers/musicful
```

The page must contain these sections.

## 3.1 Connection

Fields:

### Provider enabled

```text
Musicful enabled
```

Type:

```text
toggle
```

Default:

```text
false
```

### API base URL

```text
https://api.musicful.ai
```

Type:

```text
text
```

Recommended behavior:

- Prefilled.
- Editable only by super-admin.
- Validate HTTPS.
- Normally do not change it.

### API key

Label:

```text
Musicful API Key
```

Type:

```text
password
```

UI behavior:

- Greyed/masked by default.
- Show only dots or a masked suffix, for example:

  mf_••••••••••••••••A91K

- Never return the plaintext secret from the backend once saved.
- Add a “Replace API key” button.
- Add a “Show while typing” icon only before save.
- After save, never reveal the complete key again.

### Connection test

Button:

```text
Test Musicful connection
```

The backend must call:

```http
GET /v1/get_api_key_info
```

with:

```http
x-api-key: <decrypted server-side key>
```

Show:

```text
Connected
Invalid key
Expired/inactive key
Connection error
Musicful unavailable
```

When successful, display:

- key_status
- key_music_counts
- email
- member_id
- key_created_at
- key_updated_at
- key_recently_used_at
- key_name

Do NOT display x_api_key even if the provider returns it.

---

# 4. Secret Handling Rules

The Musicful API key is a secret.

Mandatory rules:

1. Never store the key in localStorage.
2. Never store the key in sessionStorage.
3. Never expose it through a public API route.
4. Never pass it to a React Client Component.
5. Never include it in HTML, RSC payload, browser logs, Sentry breadcrumbs, analytics, or frontend error messages.
6. Never commit it to Git.
7. Never print it in server logs.
8. Encrypt it before database storage.
9. Decrypt it only immediately before a server-to-server Musicful API request.
10. Restrict read/write access to owner/super-admin only.
11. Add an audit log when the key is created, changed, deleted, enabled, disabled, or tested.
12. Redact the secret in all audit logs.

Recommended encryption:

```text
AES-256-GCM
```

Recommended server environment secret:

```text
MUSICFUL_SETTINGS_ENCRYPTION_KEY
```

Example environment variable:

```env
MUSICFUL_SETTINGS_ENCRYPTION_KEY="32-byte-or-stronger-secret"
```

Do NOT put the Musicful API key itself in a public `NEXT_PUBLIC_*` variable.

---

# 5. Recommended Database Models

Adapt names to the existing Prisma schema.

```prisma
model AiProviderConfig {
  id                  String   @id @default(cuid())
  provider            String   @unique
  enabled             Boolean  @default(false)

  apiBaseUrl           String
  apiKeyEncrypted      String?
  apiKeyIv             String?
  apiKeyAuthTag        String?
  apiKeyLast4          String?

  defaultModel         String   @default("MFV3.0")
  defaultInstrumental  Boolean  @default(false)
  defaultGender        String?
  requestTimeoutMs     Int      @default(60000)
  pollingIntervalMs    Int      @default(5000)
  maxPollingMinutes    Int      @default(10)
  maxRetries           Int      @default(2)

  lastConnectionStatus String?
  lastConnectionError  String?
  lastTestedAt         DateTime?

  providerKeyStatus    Int?
  providerCredits      Int?
  providerEmail        String?
  providerMemberId     String?
  providerKeyName      String?
  providerKeyCreatedAt DateTime?
  providerLastUsedAt   DateTime?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

Recommended provider value:

```text
musicful
```

---

# 6. Music Generation Job Model

Create a normalized job table.

```prisma
model MusicGenerationJob {
  id               String   @id @default(cuid())
  userId           String?
  provider         String   @default("musicful")

  providerTaskId   String?
  providerSongId   String?

  action           String
  model            String
  prompt           String?
  lyrics           String?
  style            String?
  title            String?

  instrumental     Boolean  @default(false)
  gender           String?

  status           String   @default("queued")
  providerStatus   Int?

  durationSeconds  Int?
  audioUrl         String?
  coverUrl         String?
  wavUrl           String?
  mp4Url           String?

  failureCode      Int?
  failureReason    String?

  requestPayload   Json?
  responsePayload  Json?

  createdAt        DateTime @default(now())
  startedAt        DateTime?
  completedAt      DateTime?
  failedAt         DateTime?

  updatedAt        DateTime @updatedAt
}
```

Recommended internal statuses:

```text
queued
submitting
processing
completed
failed
cancelled
```

Do not assume undocumented meanings for Musicful numeric status values. Preserve `providerStatus` and map them only after observing/confirming the provider's documented behavior.

---

# 7. Owner Dashboard Fields

Create the following configuration interface.

## Authentication

- Enable Musicful
- API Base URL
- API Key
- Replace API Key
- Delete API Key
- Test Connection

## Provider information

Read-only:

- Connection status
- Key status
- Remaining music rights/credits
- Account email
- Key name
- Member ID
- Key creation date
- Last provider usage date
- Last connection test

## Generation defaults

- Default Musicful model
- Default instrumental mode
- Default singer gender
- Default generation action
- Request timeout
- Polling interval
- Maximum polling duration
- Retry count

## Feature toggles

- Allow text-to-music
- Allow lyrics-to-music
- Allow instrumental music
- Allow Musicful lyrics generator
- Allow voice/vibe generation
- Allow WAV conversion
- Allow MP4 conversion

## Limits

- Max generations per user/day
- Max generations per user/hour
- Max simultaneous Musicful jobs
- Max prompt length
- Max lyrics length
- Max retry count

---

# 8. Sensitive Field UI Requirements

All sensitive fields must be visually treated as protected.

For the API key field:

```text
background: muted/grey
type=password
autocomplete=off
spellcheck=false
```

After a secret is stored:

```text
••••••••••••••••A91K
```

Do not display the original value.

Recommended pattern:

```text
[ Musicful API Key ]
[ •••••••••••••••••••••••••A91K ] [ Replace ]
```

Optional status badge:

```text
Connected
```

or:

```text
Not configured
```

Use a neutral grey background for protected fields and a small lock icon.

---

# 9. Music Generation UI

Recommended SaaS generation form:

```text
Title
Prompt / Description
Lyrics
Style
Model
Singer gender
Instrumental
Generate
```

## Required frontend options

### Model

Select:

```text
MFV3.0
MFV2.0
MFV1.5X
MFV1.5
MFV1.0
```

### Instrumental

```text
0 = vocals/lyrics mode
1 = instrumental only
```

If instrumental = 1:

- Hide or disable lyrics input.
- Do not rely on submitted lyrics because Musicful documents that lyrics are not applied when instrumental is set to 1.

### Gender

Documented options:

```text
male
female
""
```

Render user-friendly values:

```text
Automatic
Male
Female
```

---

# 10. Basic Musicful Generate Request

Documented basic request shape:

```json
{
  "action": "auto",
  "style": "Happy songs",
  "mv": "MFV3.0",
  "instrumental": 0,
  "gender": "female"
}
```

Endpoint:

```http
POST /v1/music/generate
```

Headers:

```http
Content-Type: application/json
x-api-key: YOUR_KEY
```

The `style` field controls aspects such as melody, tune and overall musical style.

Do not send unknown fields unless they are confirmed by the current Musicful OpenAPI/documentation.

The Musicful documentation also exposes multiple request families for the same endpoint:

```text
AutoGenerateRequest
CustomGenerateRequest
ExtendGenerateRequest
ConcatGenerateRequest
UploadGenerateRequest
UploadExtendGenerateRequest
ArtistGenerateRequest
```

Implementation rule:

- Build `auto` mode first.
- Add other actions only from verified Musicful schemas.
- Keep request builders separated by action.
- Do not guess the payload shape of undocumented variants.

---

# 11. Server-Side Musicful Client

Create:

```text
src/lib/musicful/client.ts
```

Example architecture:

```ts
export class MusicfulClient {
  constructor(
    private apiKey: string,
    private baseUrl = "https://api.musicful.ai"
  ) {}

  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          ...(init.headers || {}),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      const text = await response.text();
      let data: unknown = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        throw new MusicfulApiError(
          `Musicful request failed with HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

Never instantiate this class in a Client Component.

---

# 12. Get API Key Information

Server method:

```ts
async getApiKeyInfo() {
  return this.request<MusicfulApiKeyInfo>(
    "/v1/get_api_key_info",
    { method: "GET" }
  );
}
```

Recommended Zod schema:

```ts
const musicfulApiKeyInfoSchema = z.object({
  x_api_key: z.string().optional(),
  key_status: z.number(),
  key_music_counts: z.union([z.number(), z.string()]),
  email: z.string().nullable().optional(),
  member_id: z.string().nullable().optional(),
  key_created_at: z.string().nullable().optional(),
  key_updated_at: z.string().nullable().optional(),
  key_recently_used_at: z.string().nullable().optional(),
  key_name: z.string().nullable().optional(),
});
```

Immediately discard/redact:

```text
x_api_key
```

before storage or logging.

---

# 13. Generate Lyrics

Endpoint:

```http
POST /v1/lyrics
```

Payload:

```json
{
  "prompt": "Write an uplifting Afrobeats song about..."
}
```

The prompt is required and minimum length is 1.

Server method:

```ts
async generateLyrics(prompt: string) {
  return this.request(
    "/v1/lyrics",
    {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }
  );
}
```

Validation:

```ts
const generateLyricsSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
});
```

The max above is an application-level safeguard, not a Musicful-documented maximum unless the provider later documents one.

---

# 14. Generate Music

Endpoint:

```http
POST /v1/music/generate
```

Validated request:

```ts
const musicfulAutoGenerateSchema = z.object({
  action: z.literal("auto"),
  style: z.string().trim().min(1).max(5000).nullable().optional(),
  mv: z.enum([
    "MFV3.0",
    "MFV2.0",
    "MFV1.5X",
    "MFV1.5",
    "MFV1.0",
  ]),
  instrumental: z.union([z.literal(0), z.literal(1)]).default(0),
  gender: z.enum(["male", "female", ""]).nullable().optional(),
});
```

Before submitting:

- Ensure provider is enabled.
- Ensure API key exists.
- Validate user entitlement/credits.
- Enforce application rate limits.
- Enforce SaaS plan restrictions.
- Enforce concurrency restrictions.
- Save a local job record before external submission.

---

# 15. Poll Music Task Status

Endpoint:

```http
GET /v1/music/tasks?ids=<ID>
```

Response item fields currently documented:

```text
id
duration
status
title
style
audio_url
cover_url
song_id
lyric
fail_code
fail_reason
```

Zod schema:

```ts
const musicfulTaskSchema = z.object({
  id: z.string(),
  duration: z.number(),
  status: z.number(),
  title: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  audio_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  song_id: z.string().nullable().optional(),
  lyric: z.string().nullable().optional(),
  fail_code: z.number().nullable().optional(),
  fail_reason: z.string().nullable().optional(),
});

const musicfulTasksSchema = z.array(musicfulTaskSchema);
```

Do not block an HTTP request for many minutes waiting for music generation.

Recommended workflow:

1. User clicks Generate.
2. Server validates request.
3. Server submits job to Musicful.
4. Save Musicful task ID.
5. Return internal job ID immediately.
6. Background/polling worker checks `/v1/music/tasks`.
7. Update local database.
8. UI polls your own SaaS endpoint.
9. When completed, display track.

If a job queue is available, prefer it.

Examples:

```text
BullMQ
Cloud Tasks
QStash
Inngest
Trigger.dev
custom DB worker
```

Use the existing project infrastructure when possible.

---

# 16. Vibe Generation

Endpoint:

```http
POST /v1/music/generate-vibe?song_id=<SONG_ID>
```

Required query parameter:

```text
song_id
```

Purpose:

Create a vibe to specify the singer’s voice quality and the song’s vibe when generating a song.

Server method:

```ts
async generateVibe(songId: string) {
  const params = new URLSearchParams({ song_id: songId });

  return this.request(
    `/v1/music/generate-vibe?${params}`,
    { method: "POST" }
  );
}
```

Validate song ownership before calling this endpoint.

---

# 17. WAV Conversion

Endpoint:

```http
POST /v1/music/generate-wav?song_id=<SONG_ID>
```

Required:

```text
song_id
```

Server method:

```ts
async convertToWav(songId: string) {
  const params = new URLSearchParams({ song_id: songId });

  return this.request(
    `/v1/music/generate-wav?${params}`,
    { method: "POST" }
  );
}
```

Do not expose arbitrary song IDs from other users.

---

# 18. MP4 Conversion

Endpoint:

```http
POST /v1/music/generate-mp4?song_id=<SONG_ID>
```

Required:

```text
song_id
```

Server method:

```ts
async convertToMp4(songId: string) {
  const params = new URLSearchParams({ song_id: songId });

  return this.request(
    `/v1/music/generate-mp4?${params}`,
    { method: "POST" }
  );
}
```

---

# 19. Internal SaaS API Routes

Recommended routes:

```text
POST /api/admin/ai-providers/musicful/settings
GET  /api/admin/ai-providers/musicful/settings
POST /api/admin/ai-providers/musicful/test
POST /api/admin/ai-providers/musicful/rotate-key
DELETE /api/admin/ai-providers/musicful/key

POST /api/music/generate
POST /api/music/lyrics
GET  /api/music/jobs/:id
POST /api/music/jobs/:id/wav
POST /api/music/jobs/:id/mp4
POST /api/music/jobs/:id/vibe
```

Critical rule:

Browser -> Your Next.js API -> Musicful

Never:

Browser -> Musicful directly

---

# 20. Recommended Next.js Architecture

```text
src/
  app/
    admin/
      settings/
        ai-providers/
          musicful/
            page.tsx

    api/
      admin/
        ai-providers/
          musicful/
            settings/route.ts
            test/route.ts

      music/
        generate/route.ts
        lyrics/route.ts
        jobs/[id]/route.ts
        jobs/[id]/wav/route.ts
        jobs/[id]/mp4/route.ts
        jobs/[id]/vibe/route.ts

  lib/
    musicful/
      client.ts
      config.ts
      crypto.ts
      errors.ts
      schemas.ts
      types.ts
      mapper.ts

  services/
    music/
      musicful.service.ts
      music-jobs.service.ts
```

---

# 21. Zod Validation Requirements

All inbound data must be validated twice:

1. Frontend/form validation.
2. Server validation.

The server validation is authoritative.

Admin settings schema:

```ts
const musicfulAdminSettingsSchema = z.object({
  enabled: z.boolean(),
  apiBaseUrl: z.string().url().refine(
    (value) => value.startsWith("https://"),
    "HTTPS required"
  ),
  apiKey: z.string().trim().min(1).optional(),
  defaultModel: z.enum([
    "MFV3.0",
    "MFV2.0",
    "MFV1.5X",
    "MFV1.5",
    "MFV1.0",
  ]),
  defaultInstrumental: z.boolean(),
  defaultGender: z.enum(["male", "female", ""]).nullable(),
  requestTimeoutMs: z.number().int().min(5000).max(120000),
  pollingIntervalMs: z.number().int().min(2000).max(30000),
  maxPollingMinutes: z.number().int().min(1).max(60),
  maxRetries: z.number().int().min(0).max(5),
});
```

---

# 22. Rate Limiting

Protect these routes:

```text
/api/music/generate
/api/music/lyrics
/api/music/jobs/*
```

Apply limits per:

- user
- IP
- tenant
- SaaS plan

Example:

```text
Free: 1 generation at a time
Basic: 2
Pro: 5
Owner testing: configurable
```

Do not automatically mirror Musicful plan concurrency unless confirmed against the active provider plan.

Provider pricing currently advertises different concurrent-job limits depending on Musicful subscription; therefore make SaaS-side concurrency configurable.

---

# 23. Error Handling

Create normalized error codes:

```text
MUSICFUL_NOT_CONFIGURED
MUSICFUL_DISABLED
MUSICFUL_INVALID_KEY
MUSICFUL_NO_CREDITS
MUSICFUL_RATE_LIMITED
MUSICFUL_TIMEOUT
MUSICFUL_BAD_REQUEST
MUSICFUL_PROVIDER_ERROR
MUSICFUL_TASK_FAILED
MUSICFUL_RESPONSE_INVALID
```

Do not send raw Musicful provider responses to end users.

Admin may see sanitized provider details.

End users should see messages such as:

```text
Music generation could not be completed. Please try again.
```

---

# 24. Retry Strategy

Retry only safe transient errors:

```text
408
429
500
502
503
504
network reset
temporary DNS failure
```

Recommended backoff:

```text
attempt 1: 1s
attempt 2: 2s
attempt 3: 4s
```

Add jitter.

Do NOT blindly retry a generation POST if Musicful may already have accepted it and no idempotency mechanism is documented.

For uncertain POST failures:

- Save submission state.
- Mark as `submission_uncertain`.
- Reconcile before resubmitting where possible.

---

# 25. Credit / Rights Monitoring

Use:

```http
GET /v1/get_api_key_info
```

Read:

```text
key_music_counts
```

Display it in the owner dashboard as:

```text
Remaining Musicful rights / credits
```

Do not assume the unit always equals exactly one song.

Add alerts:

```text
Warning threshold: configurable
Critical threshold: configurable
```

Example:

```text
Warning below 100
Critical below 20
```

---

# 26. Audit Logs

Log these admin events:

```text
musicful.settings.updated
musicful.api_key.created
musicful.api_key.replaced
musicful.api_key.deleted
musicful.connection.tested
musicful.enabled
musicful.disabled
```

Log generation lifecycle:

```text
musicful.generation.created
musicful.generation.submitted
musicful.generation.completed
musicful.generation.failed
musicful.wav.requested
musicful.mp4.requested
musicful.vibe.requested
```

Never log:

```text
full API key
authorization secret
raw secret-bearing headers
```

---

# 27. Security Checklist

Before production:

- [ ] API key stored encrypted.
- [ ] API key never exposed client-side.
- [ ] No `NEXT_PUBLIC_MUSICFUL_API_KEY`.
- [ ] Owner-only settings routes.
- [ ] RBAC verified server-side.
- [ ] Zod validation on every route.
- [ ] API key masked after save.
- [ ] API key redacted from logs.
- [ ] API key redacted from errors.
- [ ] CSRF protection appropriate for admin mutations.
- [ ] Rate limiting enabled.
- [ ] Generation concurrency limits enabled.
- [ ] Timeout enabled.
- [ ] SSRF protection on configurable base URL.
- [ ] HTTPS-only base URL.
- [ ] Response schemas validated.
- [ ] Ownership checks on job/song IDs.
- [ ] Audit logs enabled.
- [ ] `.env*` files ignored by Git.
- [ ] No credentials in browser bundle.
- [ ] Dependency audit clean.
- [ ] Integration tests passing.
- [ ] Staging test completed before production.

---

# 28. SSRF Protection

If the API Base URL is editable, restrict it.

Recommended production allowlist:

```text
https://api.musicful.ai
```

Do not let an admin-entered URL call:

```text
localhost
127.0.0.1
169.254.169.254
private RFC1918 ranges
internal metadata services
```

Best default:

Do not make API Base URL editable in production. Show it as read-only unless a developer mode is enabled.

---

# 29. Admin UX

Suggested Musicful card:

```text
Musicful
AI music generation provider

Status: Connected
Model: MFV3.0
Remaining rights: 1,248
Last test: 2 minutes ago

[ Configure ] [ Test connection ]
```

Configuration screen:

```text
Connection
--------------------------------
Enable Musicful        [ ON ]

API Base URL
[ https://api.musicful.ai ]

Musicful API Key
[ ••••••••••••••••••••A91K ] [ Replace ]

[ Test connection ]

Provider account
--------------------------------
Status: Connected
Key status: Active
Credits/Rights: 1248
Account: owner@example.com
Last provider use: ...

Generation defaults
--------------------------------
Default model          [ MFV3.0 ▼ ]
Singer gender          [ Automatic ▼ ]
Instrumental default   [ OFF ]
Timeout                [ 60 s ]
Polling interval       [ 5 s ]
Max wait               [ 10 min ]

Features
--------------------------------
Text to music          [ ON ]
Lyrics to music        [ ON ]
Instrumental           [ ON ]
Lyrics generator       [ ON ]
Vibe                    [ ON ]
WAV                     [ ON ]
MP4                     [ ON ]
```

---

# 30. User Music Generation UX

Suggested workflow:

```text
1. User enters song idea.
2. User optionally enters lyrics.
3. User selects musical style.
4. User selects singer gender.
5. User selects instrumental or vocal.
6. User clicks Generate.
7. SaaS creates local generation job.
8. Server calls Musicful.
9. UI shows progress.
10. SaaS polls its own job endpoint.
11. Generated audio appears.
12. User can play/download.
13. Optional WAV conversion.
14. Optional MP4 conversion.
```

---

# 31. Generated Music Result Card

Show:

```text
Cover
Title
Duration
Style
Audio player
Lyrics
Status

[ Download audio ]
[ Generate WAV ]
[ Generate MP4 ]
[ Create vibe ]
```

Only show actions supported by the current completed job and available `song_id`.

---

# 32. Storage Strategy

Do not rely forever on third-party URLs without checking their retention policy.

Recommended architecture:

```text
Musicful result
      ↓
temporary provider URL
      ↓
server downloads authorized asset
      ↓
your object storage
      ↓
stable SaaS asset URL
```

Possible storage:

```text
Cloudflare R2
AWS S3
Supabase Storage
Vercel Blob
Cloudinary
```

Only copy/store files when licensing and provider terms permit.

---

# 33. Multi-Tenant SaaS Rules

For a multi-tenant SaaS:

```text
Owner Musicful API key
        ↓
central provider configuration
        ↓
all tenant generation requests
```

Do NOT give tenant admins access to the provider key.

Recommended owner-only capability:

```text
ai_provider.manage
```

Recommended tenant capability:

```text
music.generate
```

Recommended user capability:

```text
music.generate.own
```

---

# 34. Usage Accounting

Create internal usage records independent of Musicful.

```prisma
model AiUsageEvent {
  id          String   @id @default(cuid())
  userId      String?
  tenantId    String?
  provider    String
  operation   String
  jobId       String?
  model       String?
  successful  Boolean
  createdAt   DateTime @default(now())
}
```

Operations:

```text
music.generate
lyrics.generate
music.vibe
music.wav
music.mp4
```

This lets your SaaS meter subscriptions even if Musicful's accounting model changes.

---

# 35. Integration Tests

Required tests:

## Authentication

- Valid API key.
- Invalid API key.
- Missing API key.
- Disabled provider.

## Admin security

- Normal user cannot read settings.
- Normal user cannot update settings.
- Normal user cannot test provider.
- API key never returned in plaintext.

## Generation

- Valid auto generation.
- Instrumental generation.
- Male voice option.
- Female voice option.
- All supported model values.
- Invalid model rejected.
- Missing style handled correctly.
- Provider validation error handled.

## Task polling

- Processing task.
- Completed task.
- Failed task.
- Unknown task.
- Invalid provider response.

## Media conversion

- Valid WAV conversion.
- Valid MP4 conversion.
- Missing song ID.
- Song owned by another user.

## Lyrics

- Valid prompt.
- Empty prompt.
- Oversized application prompt.

## Security

- SSRF test.
- Rate limit test.
- Secret redaction test.
- Access-control test.
- Zod validation test.

---

# 36. Staging Checklist

Before production:

```text
1. Configure Musicful staging key.
2. Test get_api_key_info.
3. Generate one vocal song.
4. Generate one instrumental.
5. Test every enabled model.
6. Verify task polling.
7. Verify audio playback.
8. Verify cover image.
9. Verify lyrics persistence.
10. Verify WAV conversion.
11. Verify MP4 conversion.
12. Verify vibe action.
13. Test invalid API key.
14. Test exhausted rights/credits.
15. Test timeout.
16. Test 429 behavior.
17. Verify API key never reaches browser.
18. Run npm audit.
19. Run integration tests.
20. Review logs for accidental secrets.
```

Only deploy to production after staging passes.

---

# 37. Agent Instructions

When this skill is invoked, the coding agent must:

1. Inspect the existing project before making changes.
2. Preserve current functionality.
3. Treat changes as a professional refactor/integration.
4. Reuse existing authentication, RBAC, database, logging, UI, and API conventions.
5. Do not duplicate an existing provider abstraction.
6. Add Musicful through the existing provider pattern if one exists.
7. Use TypeScript strict typing.
8. Use Zod server-side validation.
9. Keep all secrets server-side.
10. Never expose Musicful API keys to the browser.
11. Add database migrations safely.
12. Add tests.
13. Run lint.
14. Run typecheck.
15. Run tests.
16. Run production build.
17. Fix regressions introduced by the integration.
18. Produce a final integration report.

---

# 38. Existing Provider Abstraction

If the SaaS already supports providers such as OpenAI, Claude, Grok, or another music API, first inspect whether there is an abstraction similar to:

```ts
interface MusicProvider {
  generateMusic(input: GenerateMusicInput): Promise<GenerationJob>;
  getJob(id: string): Promise<GenerationJob>;
}
```

If yes, implement:

```ts
class MusicfulProvider implements MusicProvider
```

Do not create a parallel architecture unnecessarily.

---

# 39. Provider Interface Recommendation

```ts
export interface MusicProvider {
  id: string;

  testConnection(): Promise<ProviderConnectionResult>;

  generateMusic(
    input: MusicGenerationInput
  ): Promise<ProviderGenerationResult>;

  getTask(
    providerTaskId: string
  ): Promise<ProviderTaskResult>;

  generateLyrics?(
    prompt: string
  ): Promise<ProviderLyricsResult>;

  generateVibe?(
    songId: string
  ): Promise<unknown>;

  convertToWav?(
    songId: string
  ): Promise<unknown>;

  convertToMp4?(
    songId: string
  ): Promise<unknown>;
}
```

---

# 40. Recommended Musicful Configuration Type

```ts
export interface MusicfulConfig {
  enabled: boolean;
  apiBaseUrl: string;
  apiKey: string;
  defaultModel:
    | "MFV3.0"
    | "MFV2.0"
    | "MFV1.5X"
    | "MFV1.5"
    | "MFV1.0";
  defaultInstrumental: boolean;
  defaultGender: "male" | "female" | "";
  timeoutMs: number;
  pollingIntervalMs: number;
  maxPollingMinutes: number;
  maxRetries: number;
}
```

---

# 41. Do Not Guess Undocumented API Fields

Musicful's generate endpoint exposes multiple request-schema families.

The coding agent MUST:

- inspect the current Musicful documentation/OpenAPI before implementing non-auto actions;
- use exact official field names and enums;
- never invent payload fields;
- avoid copying fields from unrelated Suno-compatible APIs;
- keep unsupported features disabled until their request schema has been confirmed.

This is especially important for:

```text
CustomGenerateRequest
ExtendGenerateRequest
ConcatGenerateRequest
UploadGenerateRequest
UploadExtendGenerateRequest
ArtistGenerateRequest
```

---

# 42. Future-Proofing

Create a provider capability object:

```ts
const musicfulCapabilities = {
  musicGeneration: true,
  lyricsGeneration: true,
  instrumental: true,
  singerGender: true,
  vibe: true,
  wavConversion: true,
  mp4Conversion: true,
  taskPolling: true,
};
```

Feature flags in the UI should derive from provider capability/configuration rather than hardcoded visibility.

---

# 43. Production Logging

Allowed:

```text
provider=musicful
operation=generate
jobId=...
httpStatus=...
durationMs=...
```

Forbidden:

```text
x-api-key=...
Authorization=...
full secret headers
```

For prompt/lyrics logging, respect the SaaS privacy model. Prefer metadata and hashes where full creative content is not required for debugging.

---

# 44. Final Acceptance Criteria

The Musicful integration is considered complete only if:

- [ ] Owner can configure Musicful from SaaS dashboard.
- [ ] API key is masked/greyed and encrypted.
- [ ] API key never enters the browser after save.
- [ ] Test connection works.
- [ ] Key/account status is displayed.
- [ ] Remaining Musicful rights/credits are displayed.
- [ ] Owner can enable/disable Musicful.
- [ ] Default model can be selected.
- [ ] Users can generate music.
- [ ] Instrumental mode works.
- [ ] Gender preference is supported.
- [ ] Generation jobs are persisted.
- [ ] Async job status is handled.
- [ ] Audio URL is stored.
- [ ] Cover URL is stored.
- [ ] Song ID is stored.
- [ ] Lyrics are stored.
- [ ] Failure information is stored.
- [ ] Lyrics endpoint is integrated.
- [ ] Vibe endpoint is integrated.
- [ ] WAV conversion is integrated.
- [ ] MP4 conversion is integrated.
- [ ] Zod validation is present.
- [ ] RBAC is present.
- [ ] Rate limits are present.
- [ ] Secrets are redacted from logs.
- [ ] Automated tests pass.
- [ ] Production build passes.
- [ ] Staging validation passes.

---

# 45. Implementation Command for Coding Agent

Use the following instruction when invoking this skill:

```text
Integrate Musicful into the current SaaS using this skill.

First inspect the existing architecture, authentication, RBAC, Prisma schema,
API routes, provider abstractions, settings screens, encryption utilities,
logging, rate limiting and Zod conventions.

Then implement Musicful as a clean refactor without breaking existing
features.

The SaaS owner must be able to securely configure the Musicful API key from
the admin dashboard. The key field must be masked/greyed after saving, stored
encrypted, and never returned to the browser.

Implement:
- connection testing;
- API key/account information;
- remaining provider rights/credits;
- model configuration;
- music generation;
- instrumental mode;
- supported gender selection;
- asynchronous generation tracking;
- lyrics generation;
- vibe generation;
- WAV conversion;
- MP4 conversion;
- usage accounting;
- audit logging;
- Zod validation;
- RBAC;
- rate limiting;
- safe provider error handling;
- retries only when safe;
- integration tests.

Use:
https://api.musicful.ai

Authentication header:
x-api-key

Do not invent Musicful payload fields. Re-check the current official Musicful
API documentation/OpenAPI before implementing any request mode beyond the
verified auto-generation schema.

Run lint, typecheck, tests and production build. Fix any regression caused by
this integration. Validate in staging before production deployment.
```

---

# 46. Official Documentation References

Musicful API landing page:

```text
https://fr.musicful.ai/api/ai-music/
```

Musicful API docs:

```text
https://docs.musicful.ai/
```

API key information:

```text
https://docs.musicful.ai/api-reference/x-api-key-info/get-api-key-info
```

Generate music:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-generate-music
```

Task details:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-get-music-task-details
```

Generate lyrics:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-generate-lyrics
```

Generate vibe:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-generate-vibe
```

Convert WAV:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-convert-to-wav-format
```

Convert MP4:

```text
https://docs.musicful.ai/api-reference/ai-music-generator/v1-convert-to-mp4-format
```

---

# End of Skill
