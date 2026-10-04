# Musicful v2 — MP3 Only Integration Skill

## Version

Skill: Musicful SaaS Integration  
Version: 2.0  
Mode: MP3 ONLY  
Target: Existing or new Next.js SaaS  
Provider: Musicful AI Music API

---

# 1. Objective

Integrate or update Musicful inside an existing SaaS so that the final user-facing music format is **audio MP3 only**.

This version supersedes any previous Musicful integration instructions that automatically generate, request, expose, store, or download MP4.

Primary requirements:

- Musicful API settings must be manageable from the SaaS owner/super-admin dashboard.
- The Musicful API key must remain server-side, encrypted and masked.
- Generated music must be presented as AUDIO, not video.
- The application must use Musicful's generated audio result as the source of truth.
- MP4 generation must never be automatic.
- MP4 endpoints, buttons and output fields must be removed or disabled.
- The final downloadable format exposed to users must be `.mp3`.
- If Musicful's returned audio resource is already MP3, use it directly.
- If the returned audio resource is audio but not actually MP3, normalize it server-side to MP3 before exposing a downloadable final asset.
- Never rename a non-MP3 binary to `.mp3` without transcoding.
- Preserve all existing working SaaS functionality.

---

# 2. Official Musicful API

Base URL:

```text
https://api.musicful.ai
```

Authentication:

```http
x-api-key: YOUR_MUSICFUL_API_KEY
```

The API key is a server secret.

Never send it to:

- React Client Components
- browser JavaScript
- localStorage
- sessionStorage
- frontend environment variables
- analytics
- client logs
- public API responses

Never use:

```text
NEXT_PUBLIC_MUSICFUL_API_KEY
```

---

# 3. MP3-Only Golden Rule

```text
Musicful generation
        ↓
Musicful task result
        ↓
audio_url
        ↓
validate audio response
        ↓
already MP3?
   yes ────────→ store/use MP3
    no
     ↓
server-side audio transcoding
     ↓
MP3
     ↓
store/use MP3
```

Forbidden workflow:

```text
Musicful generation
        ↓
song_id
        ↓
generate-mp4
        ↓
MP4
```

The SaaS must never call the MP4 conversion endpoint as part of the normal generation flow.

---

# 4. Remove MP4 from Existing Installation

When updating an existing Musicful installation, first inspect the project for:

```text
generate-mp4
generateMp4
convertToMp4
mp4Url
mp4_url
videoUrl
video_url
video/mp4
.mp4
Generate MP4
Download MP4
Créer MP4
Télécharger MP4
```

Remove Musicful-specific MP4 logic when it is used for:

- generation output
- post-generation conversion
- automatic background processing
- downloads
- media player source
- result cards
- database output selection
- webhook/task completion processing

Do not remove unrelated MP4 functionality from other parts of the SaaS.

---

# 5. Do Not Break Existing Installation

For an existing Musicful integration:

1. Inspect current architecture.
2. Inspect current database schema.
3. Inspect existing Musicful client/service.
4. Inspect Musicful admin settings.
5. Inspect current generation route.
6. Inspect polling/task status code.
7. Inspect how media URLs are selected.
8. Inspect whether an automatic MP4 conversion is triggered.
9. Inspect download logic.
10. Inspect current storage provider.
11. Refactor only what is necessary.
12. Preserve existing user data.
13. Preserve API credentials.
14. Preserve current successful generation features.
15. Add migrations only if required.

Never delete the existing encrypted Musicful API key during the update.

---

# 6. Musicful Admin Dashboard

Recommended route:

```text
/admin/settings/ai-providers/musicful
```

Owner/super-admin only.

Sections:

```text
Musicful
├── Connection
├── Account
├── Generation
├── MP3 Output
├── Limits
└── Diagnostics
```

---

# 7. Connection Settings

## Enable Musicful

Type:

```text
toggle
```

## API Base URL

Default:

```text
https://api.musicful.ai
```

Prefer read-only in production.

## Musicful API Key

Type:

```text
password
```

Requirements:

- grey/muted protected field
- masked after saving
- never send plaintext key back to browser
- allow replacement
- allow deletion only after explicit admin action
- add audit event for every modification

Example display:

```text
Musicful API Key
[ •••••••••••••••••••••••••A91K ]  [ Replace ]
```

Use a lock icon.

---

# 8. Sensitive Field Security

Recommended database encryption:

```text
AES-256-GCM
```

Suggested application secret:

```env
MUSICFUL_SETTINGS_ENCRYPTION_KEY="..."
```

Never use the Musicful key itself as the encryption key.

Store separately:

```text
ciphertext
iv
authTag
last4
```

---

# 9. Test Connection

Add:

```text
Test Musicful connection
```

Server-side test endpoint:

```text
POST /api/admin/ai-providers/musicful/test
```

The SaaS backend should call Musicful's API-key information endpoint when supported by current documentation.

Display only sanitized provider/account information.

Never return the Musicful API key itself.

---

# 10. Generation Output Settings

Add:

```text
Final output format
[ MP3 — Audio only 🔒 ]
```

Do not offer:

```text
MP4
Video
MP4 + Lyrics
```

For this skill:

```text
MP3 = enabled
WAV = disabled
MP4 = disabled
```

---

# 11. Generation Form

Recommended user fields:

```text
Title
Prompt
Lyrics
Musical style
Model
Singer gender
Instrumental
Generate
```

Do NOT expose output-format selection to users.

---

# 12. Musicful Generation Flow

Use Musicful's current documented generation endpoint:

```text
POST /v1/music/generate
```

Persist the returned provider task identifier.

Do not immediately request MP4.

---

# 13. Task Polling

Poll:

```text
GET /v1/music/tasks?ids=<TASK_ID>
```

When complete, extract:

```text
audio_url
```

Treat `audio_url` as the primary media output.

Potentially useful fields:

```text
id
status
title
duration
style
audio_url
cover_url
song_id
lyric
fail_code
fail_reason
```

Do NOT select MP4/video fields even if present.

---

# 14. MP3 Validation

Do not trust URL extensions alone.

Check:

```text
HTTP status
Content-Type
Content-Length
binary/file signature when needed
```

Common MP3 MIME types:

```text
audio/mpeg
audio/mp3
audio/x-mpeg
```

---

# 15. Never Fake MP3

Forbidden:

```ts
const mp3Url = audioUrl.replace(".mp4", ".mp3");
```

Forbidden:

```ts
fs.renameSync("song.mp4", "song.mp3");
```

Changing a filename or MIME header does not convert media.

---

# 16. MP3 Normalization

If the returned audio is not MP3, transcode server-side.

Recommended:

```text
FFmpeg
```

Example:

```bash
ffmpeg -i input_audio -vn -codec:a libmp3lame -b:a 192k output.mp3
```

Suggested default:

```text
Codec: libmp3lame
Bitrate: 192 kbps
Video: disabled
```

Do not transcode an already valid MP3 unless needed.

---

# 17. Serverless Considerations

For Vercel/serverless, prefer background processing when transcoding may exceed request limits.

Possible strategies:

```text
background job
dedicated worker
ffmpeg-static where compatible
cloud transcoding service
```

---

# 18. Storage

Recommended flow:

```text
Musicful audio_url
        ↓
backend fetch
        ↓
validate audio
        ↓
transcode if necessary
        ↓
final .mp3
        ↓
object storage
        ↓
stable SaaS URL
```

Possible providers:

```text
Cloudflare R2
AWS S3
Supabase Storage
Vercel Blob
Cloudinary
```

---

# 19. Final MP3 Filename

Example:

```text
song-title-<short-id>.mp3
```

Sanitize filenames and never trust arbitrary user paths.

---

# 20. Download Headers

Use:

```http
Content-Type: audio/mpeg
Content-Disposition: attachment; filename="song-name.mp3"
```

Only after verifying a real MP3 resource.

---

# 21. Audio Player

Use:

```tsx
<audio controls preload="metadata">
  <source src={track.mp3Url} type="audio/mpeg" />
</audio>
```

Do not use `<video>` for Musicful-generated tracks.

---

# 22. Download Button

Show:

```text
Télécharger MP3
```

Do not show:

```text
Télécharger MP4
Créer vidéo
MP4
```

---

# 23. Database Model

Example Prisma model:

```prisma
model MusicGenerationJob {
  id                 String   @id @default(cuid())
  userId             String?
  provider           String   @default("musicful")

  providerTaskId     String?
  providerSongId     String?

  model              String?
  title              String?
  prompt             String?
  lyrics             String?
  style              String?
  instrumental       Boolean  @default(false)
  gender             String?

  status             String   @default("queued")
  providerStatus     Int?

  durationSeconds    Int?
  providerAudioUrl   String?
  mp3Url             String?
  coverUrl           String?

  audioMimeType      String?
  audioNormalized    Boolean  @default(false)
  audioSizeBytes     BigInt?

  failureCode        Int?
  failureReason      String?

  createdAt          DateTime @default(now())
  completedAt        DateTime?
  failedAt           DateTime?
  updatedAt          DateTime @updatedAt
}
```

Do not add `mp4Url` in the new design.

---

# 24. Legacy Migration

If the existing schema already contains `mp4Url`, use a safe phased migration:

```text
Phase 1:
- stop writing MP4
- stop reading MP4
- introduce/use mp3Url
- deploy

Phase 2:
- verify production
- confirm no code references

Phase 3:
- optionally remove obsolete mp4Url column
```

---

# 25. Internal SaaS API Routes

Recommended:

```text
POST /api/music/generate
GET  /api/music/jobs/:id
GET  /api/music/jobs/:id/audio
GET  /api/music/jobs/:id/download
```

Admin:

```text
GET    /api/admin/ai-providers/musicful/settings
POST   /api/admin/ai-providers/musicful/settings
POST   /api/admin/ai-providers/musicful/test
DELETE /api/admin/ai-providers/musicful/key
```

Do not create a Musicful MP4 route.

---

# 26. Musicful Client

Recommended location:

```text
src/lib/musicful/client.ts
```

All calls must remain server-side.

---

# 27. Audio Fetcher Security

Create a server-only fetcher that:

```text
validates HTTPS URL
uses host allowlisting where possible
blocks private/internal IP destinations
uses timeout
limits redirects
checks status
checks Content-Type
enforces max file size
detects actual format
```

Prevent SSRF.

---

# 28. MP3 Normalizer

Recommended abstraction:

```ts
interface AudioNormalizationResult {
  path?: string;
  buffer?: Buffer;
  mimeType: "audio/mpeg";
  extension: "mp3";
  normalized: boolean;
}
```

Function:

```ts
normalizeToMp3(source): Promise<AudioNormalizationResult>
```

Behavior:

```text
verified MP3 → keep
other valid audio → transcode to MP3
invalid media → reject
```

---

# 29. Never Use MP4 as an Intermediate

If the old flow is:

```text
generate
→ MP4
→ extract audio
→ MP3
```

replace it with:

```text
generate
→ audio_url
→ MP3
```

---

# 30. Disable Musicful MP4 Endpoint

Search for:

```text
/v1/music/generate-mp4
```

For this skill:

```text
DO NOT CALL
```

Remove or deprecate methods such as:

```ts
generateMp4();
convertToMp4();
```

when safe.

---

# 31. Configuration Type

```ts
export interface MusicfulConfig {
  enabled: boolean;
  apiBaseUrl: string;
  apiKey: string;

  defaultModel: "MFV3.0" | "MFV2.0" | "MFV1.5X" | "MFV1.5" | "MFV1.0";

  defaultInstrumental: boolean;
  defaultGender: "male" | "female" | "";

  outputFormat: "mp3";
  mp4Enabled: false;
  wavEnabled: false;

  mp3BitrateKbps: 192 | 256 | 320;

  timeoutMs: number;
  pollingIntervalMs: number;
  maxPollingMinutes: number;
  maxRetries: number;
}
```

---

# 32. Fixed Output Validation

```ts
const musicfulOutputSettingsSchema = z.object({
  outputFormat: z.literal("mp3"),
  mp4Enabled: z.literal(false),
  wavEnabled: z.literal(false),
  mp3BitrateKbps: z.union([z.literal(192), z.literal(256), z.literal(320)]).default(192),
});
```

---

# 33. Completion Workflow

Pseudo-code:

```ts
async function processMusicfulJob(jobId: string) {
  const job = await getJob(jobId);

  const task = await musicful.getTask(job.providerTaskId!);

  if (!isCompleted(task)) {
    return updateProviderStatus(job.id, task.status);
  }

  if (!task.audio_url) {
    throw new Error("MUSICFUL_AUDIO_URL_MISSING");
  }

  const source = await fetchMusicfulAudio(task.audio_url);
  const mp3 = await normalizeToMp3(source);

  const stored = await saveMp3ToStorage(mp3, {
    title: task.title ?? job.title,
    jobId: job.id,
  });

  await db.musicGenerationJob.update({
    where: { id: job.id },
    data: {
      status: "completed",
      providerAudioUrl: task.audio_url,
      mp3Url: stored.url,
      audioMimeType: "audio/mpeg",
      audioNormalized: mp3.normalized,
      providerSongId: task.song_id ?? null,
      coverUrl: task.cover_url ?? null,
      durationSeconds: task.duration ?? null,
      completedAt: new Date(),
    },
  });
}
```

No MP4 call.

---

# 34. User-Facing Media

Prefer your stable `mp3Url` for:

```text
playback
downloads
history
sharing where allowed
```

Keep raw provider URLs internal where practical.

---

# 35. Result Card

```text
Cover
Title
Style
Duration

[ Audio Player ]

[ Télécharger MP3 ]
```

No video player.

---

# 36. States

Recommended:

```text
queued
generating
processing_audio
ready
failed
```

---

# 37. Error Codes

```text
MUSICFUL_NOT_CONFIGURED
MUSICFUL_DISABLED
MUSICFUL_INVALID_KEY
MUSICFUL_NO_CREDITS
MUSICFUL_RATE_LIMITED
MUSICFUL_TIMEOUT
MUSICFUL_PROVIDER_ERROR
MUSICFUL_TASK_FAILED
MUSICFUL_AUDIO_URL_MISSING
MUSICFUL_AUDIO_FETCH_FAILED
MUSICFUL_INVALID_AUDIO
MUSICFUL_MP3_TRANSCODE_FAILED
MUSICFUL_MP3_STORAGE_FAILED
```

---

# 38. Authorization

Before returning MP3:

```text
authenticate user
verify tenant
verify job ownership/permission
verify job completed
verify asset belongs to job
```

Never proxy arbitrary user-supplied URLs.

---

# 39. Admin Diagnostics

Show:

```text
Provider status
API connection
Current model
Remaining credits/rights
MP3-only mode: Enabled
MP4: Disabled
WAV: Disabled
MP3 bitrate
Last generation
Last provider error
Last MP3 processing error
```

---

# 40. Audit Events

```text
musicful.settings.updated
musicful.api_key.created
musicful.api_key.replaced
musicful.api_key.deleted
musicful.connection.tested
musicful.enabled
musicful.disabled
musicful.generation.created
musicful.generation.submitted
musicful.generation.completed
musicful.generation.failed
musicful.audio.fetched
musicful.audio.normalized_to_mp3
musicful.mp3.stored
musicful.mp3.downloaded
```

Never log secrets.

---

# 41. Upgrade Audit

When updating from the previous Musicful integration, produce a report containing:

```text
Old MP4 references found
Files changed
Routes changed
Functions removed/disabled
Database fields deprecated
UI components changed
New MP3 flow
Tests performed
```

---

# 42. Repository Search

Search:

```text
musicful
Musicful
audio_url
mp4
generate-mp4
generateMp4
convertToMp4
video/mp4
videoUrl
mp4Url
audioUrl
download
```

Example:

```bash
rg -n "musicful|Musicful|audio_url|generate-mp4|generateMp4|convertToMp4|video/mp4|videoUrl|mp4Url|audioUrl" .
```

Inspect matches before editing.

---

# 43. Required Tests

## Generation

- Musicful generation creates provider task.
- No MP4 conversion call occurs.
- Completed task uses `audio_url`.
- Missing `audio_url` fails safely.

## MP3

- `audio/mpeg` source accepted.
- Valid MP3 without `.mp3` URL accepted.
- Non-MP3 audio transcoded.
- Fake `.mp3` rejected/transcoded appropriately.
- MP4 never selected as final output.
- Download filename ends in `.mp3`.
- Download MIME is `audio/mpeg`.

## UI

- Uses `<audio>`.
- No Musicful `<video>`.
- Shows “Télécharger MP3”.
- No MP4 button.
- No MP4 format selector.

## Security

- API key absent from browser.
- User cannot download another user's MP3.
- Audio fetcher blocks SSRF.
- File-size limits enforced.
- Secrets redacted.

---

# 44. Regression Tests

Confirm these still work:

```text
authentication
registration
subscriptions
billing
other AI providers
lyrics generation
Musicful prompts
Musicful styles
Musicful models
instrumental generation
gender selection
job history
credits
admin configuration
```

---

# 45. Build Verification

Use project scripts equivalent to:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Fix integration-caused regressions.

---

# 46. Staging Before Production

Required:

```text
development
→ tests
→ staging
→ MP3 verification
→ production
```

Generate at least:

```text
1 vocal song
1 instrumental song
1 male voice test
1 female voice test
```

Verify:

```text
audio player works
actual MP3 is produced
audio/mpeg
.mp3 download
no MP4 request
no MP4 asset created
```

---

# 47. Network Verification

Expected:

```text
POST .../v1/music/generate
GET  .../v1/music/tasks?ids=...
GET  <audio_url>
```

Forbidden:

```text
POST .../v1/music/generate-mp4
```

If `generate-mp4` appears, the update is incomplete.

---

# 48. Acceptance Criteria

- [ ] Existing Musicful API key preserved.
- [ ] API key encrypted.
- [ ] API key masked in dashboard.
- [ ] Connection test works.
- [ ] Music generation works.
- [ ] `audio_url` is primary provider media result.
- [ ] No automatic MP4 generation.
- [ ] No Musicful MP4 button.
- [ ] No Musicful video player.
- [ ] User result uses audio player.
- [ ] Final asset is verified MP3.
- [ ] MIME is `audio/mpeg`.
- [ ] Download uses `.mp3`.
- [ ] Non-MP3 audio is transcoded, not renamed.
- [ ] MP3 stored safely.
- [ ] Access control protects downloads.
- [ ] Rate limiting works.
- [ ] Zod validation works.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Staging passes.
- [ ] No `/generate-mp4` call in network traces.

---

# 49. Instructions to Antigravity / Codex

```text
Update the existing Musicful integration to Musicful v2 — MP3 Only.

IMPORTANT:
This is an update/refactor of the existing installation, not a clean reinstall.

First inspect the entire existing Musicful implementation and identify:
- API configuration
- encrypted API key storage
- Musicful client
- generation route
- task polling
- audio_url handling
- MP4 handling
- database fields
- media player
- download buttons
- background jobs
- object storage
- existing tests

Preserve all working features and existing credentials.

The required flow is:

POST /v1/music/generate
→ retrieve task ID
→ poll /v1/music/tasks
→ retrieve audio_url
→ validate remote media as audio
→ if already MP3, use directly
→ otherwise transcode server-side to real MP3
→ store final MP3
→ expose only MP3 to the user.

STRICT RULES:
- MP3 is the only user-facing final format.
- Do not call /v1/music/generate-mp4.
- Remove/disable Musicful MP4 generation.
- Remove/disable Musicful MP4 buttons.
- Remove/disable Musicful video result players.
- Do not select MP4 URLs as generated songs.
- Do not rename MP4/WAV/etc. to .mp3 without transcoding.
- Use audio_url as the provider audio source.
- Verify actual content type/file format.
- Final download must be a genuine MP3.
- Final MIME type must be audio/mpeg.
- Use an HTML audio player.
- Preserve cover art, title, lyrics, duration and song metadata.
- Keep API key server-side and encrypted.
- Keep API key field masked/greyed in owner dashboard.
- Use server-side RBAC, Zod validation and rate limiting.
- Prevent SSRF when downloading provider audio.
- Preserve existing user data.
- Apply safe database migrations.
- Do not break other AI providers or existing functionality.

If the current deployment environment cannot reliably transcode audio inside
an HTTP request, implement MP3 normalization in the existing background-job
architecture or an appropriate worker.

Search the codebase for:
musicful
Musicful
audio_url
generate-mp4
generateMp4
convertToMp4
mp4Url
videoUrl
video/mp4

Inspect every match before editing.

After implementation:
1. run lint
2. run typecheck
3. run tests
4. run production build
5. perform staging verification
6. verify no Musicful /generate-mp4 network call occurs
7. verify generated downloads are real .mp3 files with audio/mpeg
8. provide a migration report listing every modified Musicful file and every
   removed/disabled MP4 path.
```

---

# 50. Documentation References

Musicful API:

```text
https://fr.musicful.ai/api/ai-music/
```

Musicful documentation:

```text
https://docs.musicful.ai/
```

Musicful API plans:

```text
https://fr.musicful.ai/api/payment/subscription/
```

Musicful download guide:

```text
https://fr.musicful.ai/guide/
```

Musicful currently advertises MP3, WAV and MP4 export support. This skill intentionally restricts the SaaS to **MP3 ONLY**.

Always re-check current Musicful API/OpenAPI documentation before implementing provider payload fields because provider schemas can evolve.

---

# END — Musicful v2 MP3 Only
