# Rangée d'actions carte chanson (Partager / Publier / Télécharger / Poster) — Plan d'implémentation

> **Pour les workers agentiques :** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter sous chaque chanson de « Mes chansons générées » une rangée de 4 actions (Partager, Publier, Télécharger, Poster), en construisant la fonctionnalité de publication publique (lien sans compte) et le branchement de bout en bout du champ `coverUrl`, qui n'existent aujourd'hui nulle part côté client.

**Architecture:** Une nouvelle table `song_publications` (lien = ligne existante, pas de flag séparé) et deux nouvelles routes API (`publish`, `cover`) suivent exactement le squelette de sécurité déjà en place dans `app/api/songs/[groupId]/route.ts` (origine, session, rate-limit, zod, ownership). Une page publique Server Component `app/s/[slug]/page.tsx` lit directement les données (pas d'aller-retour HTTP interne). Côté client, `DemoProvider` gagne deux actions (`publishSong`, `setSongCover`) sur le modèle exact de `removeSong`, et `MySongsGeneratedScreen` les câble dans une nouvelle rangée de boutons qui réutilise les fonctions `shareVersion`/`downloadVersion` déjà présentes dans ce fichier.

**Tech Stack:** Next.js App Router (Server Components + Route Handlers), Drizzle ORM/Postgres, Zod, Cloudinary (déjà provisionné), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-song-card-share-publish-poster-design.md`

## Global Constraints

- Toute chaîne fixe visible côté utilisateur passe par `t(...)` (`lib/i18n/translate.ts`) ; après implémentation, lancer `npm run i18n:sync` puis vérifier `npm run i18n:check`.
- Migration Drizzle strictement additive — aucune colonne ni route existante n'est modifiée en profondeur (seuls les libellés d'erreur anglais de `app/api/uploads/images/route.ts` sont traduits, sans changement de contrat/codes HTTP).
- Toute entrée non fiable validée côté serveur avec Zod.
- Toute nouvelle route mutante suit le squelette déjà en place : `rejectCrossSiteMutation` → session `auth.api.getSession` → `rateLimit` → Zod → logique → (si mutation sensible) `writeAuditLog`.
- La page publique (`app/s/[slug]`) ne renvoie jamais `userId`, `prompt`, `lyrics` ni un identifiant interne — uniquement titre/style/occasion/pochette/audio.
- Pas de bouton « dépublier » dans cette itération (validé avec l'utilisateur).
- Les 4 boutons sont ajoutés uniquement dans `components/banani/MySongsGeneratedScreen.tsx` — ni `SongPlayerScreen.tsx`, ni `SongCard.tsx`.
- Ne jamais committer de secret ; les identifiants Cloudinary restent server-only, déjà dans `.env.local`.

## Review Focus

- Republier une chanson déjà publiée doit renvoyer le **même** lien (idempotence) — sinon un lien déjà partagé publiquement se retrouverait cassé/dédoublé. Testé au Task 4.
- Cliquer « Publier » sur une chanson dont aucune version n'est `"completed"` (encore en génération) doit échouer proprement (409 + message clair), pas planter ni publier une chanson sans audio. Testé au Task 4.
- Un utilisateur A ne doit jamais pouvoir publier / changer la pochette de la chanson d'un utilisateur B en devinant un `songGroupId` — testé bout-à-bout (2 utilisateurs réels en base) au Task 4.
- La page publique pour un slug **jamais publié** et pour un slug **retiré plus tard** doivent produire exactement le même résultat (`null` → page indisponible identique) — aucun signal d'énumération. Testé au Task 4 et au Task 8.
- Une tentative de définir `coverUrl` sur une URL qui n'est pas hébergée sur `res.cloudinary.com` doit être rejetée par la route `cover` — sinon une image arbitraire deviendrait visible publiquement sans authentification une fois la chanson publiée. Testé aux Tasks 2 et 6.

---

## Task 1: Schéma — table `song_publications` + `coverUrl` sur `SongGroupView`

**Files:**
- Modify: `db/schema/index.ts:492-543` (après la définition de `musicGenerationJobs`)
- Modify: `lib/ai/songs.ts:25-34` (type `SongGroupView`), `lib/ai/songs.ts:73-91` (`toGroupView`)
- Test: `tests/song-group-cover-url.test.ts`

**Interfaces:**
- Produces: table Drizzle `songPublications` (`songGroupId` PK, `userId`, `slug` unique, `jobId`, `createdAt`) exportée depuis `@/db/schema` ; `SongGroupView.coverUrl: string | null`.

- [ ] **Step 1: Ajouter la table au schéma**

Dans `db/schema/index.ts`, juste après la fermeture de `musicGenerationJobs` (ligne 543, avant `export const customRoles = ...`) :

```ts
export const songPublications = pgTable("song_publications", {
  songGroupId: text("song_group_id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull().unique(),
  jobId: text("job_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Générer et appliquer la migration**

```bash
npm run db:generate
npm run db:migrate
```

Vérifier que le fichier généré dans `db/migrations/` contient bien `CREATE TABLE "song_publications"` avec les 5 colonnes et la contrainte unique sur `slug`.

- [ ] **Step 3: Ajouter `coverUrl` au type `SongGroupView`**

Dans `lib/ai/songs.ts`, modifier le type (ligne 25-34) :

```ts
export type SongGroupView = {
  songGroupId: string;
  title: string;
  occasion: string | null;
  style: string | null;
  lyrics: string | null;
  coverUrl: string | null;
  status: "processing" | "completed" | "failed";
  createdAt: Date;
  versions: SongVersionView[];
};
```

Et dans `toGroupView` (ligne 73-91), ajouter la ligne dérivée du premier job trié :

```ts
function toGroupView(jobs: JobRow[]): SongGroupView {
  const [first] = jobs;
  const hasCompleted = jobs.some((job) => job.status === "completed");
  const hasPending = jobs.some((job) => !TERMINAL_STATUSES.has(job.status));
  const status: SongGroupView["status"] = hasCompleted ? "completed" : hasPending ? "processing" : "failed";
  return {
    songGroupId: first.songGroupId!,
    title: first.title || "Chanson MusikPro",
    occasion: first.occasion,
    style: extractGenreLabel(first.style),
    lyrics: first.lyrics,
    coverUrl: first.coverUrl,
    status,
    createdAt: jobs.reduce((min, job) => (job.createdAt < min ? job.createdAt : min), first.createdAt),
    versions: jobs
      .slice()
      .sort((a, b) => (a.versionLabel || "").localeCompare(b.versionLabel || ""))
      .map(toVersionView),
  };
}
```

- [ ] **Step 4: Écrire le test de régression (fichier server-only, pattern `song-style-label.test.ts`)**

`lib/ai/songs.ts` importe `"server-only"` (transitivement `@/db`, qui exige `DATABASE_URL` à l'import) — comme le reste des tests de ce fichier, on vérifie le code source directement plutôt que d'importer le module.

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("SongGroupView exposes coverUrl end-to-end", () => {
  it("adds coverUrl to the SongGroupView type", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("coverUrl: string | null;");
  });

  it("derives the group cover from the first sorted job, like title/style/occasion", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("coverUrl: first.coverUrl,");
  });
});
```

- [ ] **Step 5: Lancer le test**

```bash
npx vitest run tests/song-group-cover-url.test.ts
```

Attendu : PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add db/schema/index.ts lib/ai/songs.ts tests/song-group-cover-url.test.ts db/migrations
git commit -m "feat: ajouter la table song_publications et exposer coverUrl sur SongGroupView"
```

---

## Task 2: Fonction pure `isTrustedImageUrl` (allowlist Cloudinary)

**Files:**
- Modify: `lib/storage/cloudinary.ts` (ajout en fin de fichier)
- Test: `tests/cloudinary-trusted-image-url.test.ts`

**Interfaces:**
- Produces: `isTrustedImageUrl(url: string): boolean`, exporté depuis `lib/storage/cloudinary.ts`, importable directement (le fichier n'a pas de directive `"server-only"` et ne touche pas la DB — import réel possible dans les tests, contrairement à `lib/ai/songs.ts`).

Cette fonction est le contrôle de sécurité qui protège la Review Focus « pochette hébergée hors Cloudinary » : toute URL Cloudinary signée (`uploadImageToCloudinary`) renvoie un `secure_url` sur l'hôte `res.cloudinary.com`, quel que soit le nom de cloud — vérifier ce seul hôte suffit et évite de dépendre de `CLOUDINARY_CLOUD_NAME` dans une fonction pure.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";

describe("isTrustedImageUrl", () => {
  it("accepts a real Cloudinary secure URL", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/users/abc/cover.jpg")).toBe(true);
  });

  it("rejects a different host, even if it looks similar", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com.evil.example/x.jpg")).toBe(false);
    expect(isTrustedImageUrl("https://not-cloudinary.example/x.jpg")).toBe(false);
  });

  it("rejects a non-URL string instead of throwing", () => {
    expect(isTrustedImageUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedImageUrl("")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/cloudinary-trusted-image-url.test.ts
```

Attendu : FAIL — `isTrustedImageUrl` n'existe pas encore.

- [ ] **Step 3: Implémenter**

Ajouter à la fin de `lib/storage/cloudinary.ts` :

```ts
/**
 * Guards `coverUrl` before it becomes publicly visible (see /s/[slug]): only URLs actually
 * hosted on Cloudinary's CDN are accepted, regardless of which cloud name. A naive host-string
 * check (e.g. `.includes("res.cloudinary.com")`) would accept a lookalike host like
 * `res.cloudinary.com.evil.example`, so this parses the URL and compares the exact hostname.
 */
export function isTrustedImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/cloudinary-trusted-image-url.test.ts
```

Attendu : PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/storage/cloudinary.ts tests/cloudinary-trusted-image-url.test.ts
git commit -m "feat: ajouter isTrustedImageUrl pour restreindre les pochettes au domaine Cloudinary"
```

---

## Task 3: `setSongGroupCover` dans `lib/ai/songs.ts`

**Files:**
- Modify: `lib/ai/songs.ts` (imports en tête, nouvelle fonction après `incrementSongVersionPlays`)
- Test: `tests/song-group-cover-url.test.ts` (complété)

**Interfaces:**
- Consumes: `musicGenerationJobs` (Task 1), `MusicJobOwnershipError` (déjà exporté par `lib/ai/music-jobs.ts`).
- Produces: `setSongGroupCover(userId: string, songGroupId: string, coverUrl: string): Promise<void>`.

- [ ] **Step 1: Compléter le test de régression (échoue avant l'implémentation)**

Ajouter au fichier `tests/song-group-cover-url.test.ts` créé au Task 1 :

```ts
it("exposes setSongGroupCover, scoped by userId and songGroupId, updating every version's cover", async () => {
  const source = await fs.readFile("lib/ai/songs.ts", "utf8");
  expect(source).toContain("export async function setSongGroupCover(");
  expect(source).toContain("eq(musicGenerationJobs.songGroupId, songGroupId)");
  expect(source).toContain("if (!result.length) throw new MusicJobOwnershipError();");
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/song-group-cover-url.test.ts
```

Attendu : FAIL sur le nouveau test (fonction inexistante).

- [ ] **Step 3: Implémenter**

Ajouter à la fin de `lib/ai/songs.ts` (après `incrementSongVersionPlays`, ligne 225) :

```ts
export async function setSongGroupCover(userId: string, songGroupId: string, coverUrl: string): Promise<void> {
  const database = getServiceDb();
  const result = await database
    .update(musicGenerationJobs)
    .set({ coverUrl, updatedAt: new Date() })
    .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)))
    .returning({ id: musicGenerationJobs.id });
  if (!result.length) throw new MusicJobOwnershipError();
}
```

Toutes les versions de la chanson partagent la même pochette (cohérent avec `toGroupView` qui la dérive du premier job trié, quel que soit celui qui finit « premier » après tri).

- [ ] **Step 4: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/song-group-cover-url.test.ts
```

Attendu : PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/songs.ts tests/song-group-cover-url.test.ts
git commit -m "feat: ajouter setSongGroupCover pour mettre à jour la pochette d'une chanson"
```

---

## Task 4: `publishSongGroup` + `getPublicSongBySlug` (+ test d'intégration réel, opt-in)

**Files:**
- Modify: `lib/ai/songs.ts` (imports, nouvelle classe d'erreur, deux fonctions)
- Test: `tests/song-publish.test.ts` (régression statique)
- Test: `tests/song-publish.integration.test.ts` (intégration réelle, gated — `DATABASE_URL` est déjà configuré dans cet environnement)

**Interfaces:**
- Consumes: `songPublications`, `musicGenerationJobs` (Task 1), `getSongGroupForUser` (déjà existant), `randomBytes` (`node:crypto`).
- Produces: `class SongNotReadyError extends Error {}`, `publishSongGroup(userId: string, songGroupId: string): Promise<{ slug: string }>`, `type PublicSongView`, `getPublicSongBySlug(slug: string): Promise<PublicSongView | null>`.

- [ ] **Step 1: Écrire le test de régression statique (échoue avant l'implémentation)**

Créer `tests/song-publish.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

// lib/ai/songs.ts importe "server-only" (transitivement "@/db", qui exige DATABASE_URL à
// l'import) — comme le reste des tests de ce fichier (song-style-label.test.ts,
// song-group-cover-url.test.ts), on vérifie le code source directement. Le comportement réel
// (idempotence, garde "pas prête", non-fuite, ownership croisée) est couvert par
// tests/song-publish.integration.test.ts, gated par RUN_DB_INTEGRATION_TESTS=1.
describe("Song publication (static regression)", () => {
  it("returns the existing slug instead of creating a second row (idempotent publish)", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export async function publishSongGroup(");
    expect(source).toContain("if (existing) return { slug: existing.slug };");
  });

  it("refuses to publish a song whose primary version isn't completed", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export class SongNotReadyError extends Error {}");
    expect(source).toContain("if (!primary?.audioUrl || primary.status !== \"completed\") throw new SongNotReadyError();");
  });

  it("never selects a public song row without a completed, audio-ready job", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    expect(source).toContain("export async function getPublicSongBySlug(");
    expect(source).toContain('if (!row || row.job.status !== "completed" || !row.job.audioUrl) return null;');
  });

  it("never exposes userId, prompt or lyrics in the public view", async () => {
    const source = await fs.readFile("lib/ai/songs.ts", "utf8");
    const match = source.match(/export type PublicSongView = \{[\s\S]*?\};/);
    expect(match).not.toBeNull();
    const typeBody = match![0];
    expect(typeBody).not.toContain("userId");
    expect(typeBody).not.toContain("prompt");
    expect(typeBody).not.toContain("lyrics");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/song-publish.test.ts
```

Attendu : FAIL (fonctions/classe inexistantes).

- [ ] **Step 3: Implémenter**

En tête de `lib/ai/songs.ts`, étendre les imports existants :

```ts
import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, songPublications } from "@/db/schema";
import { createMusicJob, submitSongGroupJobs, pollMusicJob, MusicJobOwnershipError } from "./music-jobs";
```

Ajouter à la fin du fichier :

```ts
export class SongNotReadyError extends Error {}

export async function publishSongGroup(userId: string, songGroupId: string): Promise<{ slug: string }> {
  const database = getServiceDb();
  const [existing] = await database
    .select({ slug: songPublications.slug })
    .from(songPublications)
    .where(and(eq(songPublications.songGroupId, songGroupId), eq(songPublications.userId, userId)));
  if (existing) return { slug: existing.slug };

  const group = await getSongGroupForUser(userId, songGroupId);
  if (!group) throw new MusicJobOwnershipError();
  const primary = group.versions[0];
  if (!primary?.audioUrl || primary.status !== "completed") throw new SongNotReadyError();

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = randomBytes(6).toString("base64url");
    try {
      await database.insert(songPublications).values({ songGroupId, userId, slug, jobId: primary.jobId });
      return { slug };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("unreachable");
}

export type PublicSongView = {
  title: string;
  style: string | null;
  occasion: string | null;
  coverUrl: string | null;
  audioUrl: string;
};

export async function getPublicSongBySlug(slug: string): Promise<PublicSongView | null> {
  const database = getServiceDb();
  const [row] = await database
    .select({ job: musicGenerationJobs })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(songPublications.slug, slug));
  if (!row || row.job.status !== "completed" || !row.job.audioUrl) return null;
  return {
    title: row.job.title || "Chanson MusikPro",
    style: extractGenreLabel(row.job.style),
    occasion: row.job.occasion,
    coverUrl: row.job.coverUrl,
    audioUrl: row.job.audioUrl,
  };
}
```

- [ ] **Step 4: Lancer le test statique pour vérifier le succès**

```bash
npx vitest run tests/song-publish.test.ts
```

Attendu : PASS (4 tests).

- [ ] **Step 5: Écrire le test d'intégration réel (opt-in, comme `tests/db-runtime-rls.test.ts`)**

`DATABASE_URL` est déjà configuré dans cet environnement de développement (confirmé dans `.env.local`), donc ce test peut être exécuté réellement ici, sans jamais s'exécuter implicitement en CI (même garde `describe.runIf` que `db-runtime-rls.test.ts`). Créer `tests/song-publish.integration.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { user, musicGenerationJobs, songPublications } from "@/db/schema";

// Run explicitly against the configured development database, never implicitly in CI —
// same opt-in pattern as tests/db-runtime-rls.test.ts.
describe.runIf(process.env.RUN_DB_INTEGRATION_TESTS === "1")("Song publication (live integration)", () => {
  it("is idempotent, refuses unready songs, enforces ownership, and never leaks between users", async () => {
    const { getServiceDb } = await import("@/db");
    const { publishSongGroup, getPublicSongBySlug, SongNotReadyError } = await import("@/lib/ai/songs");
    const { MusicJobOwnershipError } = await import("@/lib/ai/music-jobs");
    const db = getServiceDb();

    const ownerId = randomUUID();
    const otherId = randomUUID();
    const readyGroupId = randomUUID();
    const pendingGroupId = randomUUID();
    const readyJobId = randomUUID();
    const pendingJobId = randomUUID();

    try {
      await db.insert(user).values([
        { id: ownerId, name: "Publish test owner", email: `${ownerId}@example.invalid` },
        { id: otherId, name: "Publish test other", email: `${otherId}@example.invalid` },
      ]);
      await db.insert(musicGenerationJobs).values([
        {
          id: readyJobId,
          userId: ownerId,
          model: "test",
          status: "completed",
          audioUrl: "https://cdn.example.invalid/ready.mp3",
          title: "Chanson prête",
          songGroupId: readyGroupId,
          versionLabel: "Version 1",
        },
        {
          id: pendingJobId,
          userId: ownerId,
          model: "test",
          status: "processing",
          title: "Chanson en cours",
          songGroupId: pendingGroupId,
          versionLabel: "Version 1",
        },
      ]);

      // Not ready → SongNotReadyError, not a crash.
      await expect(publishSongGroup(ownerId, pendingGroupId)).rejects.toThrow(SongNotReadyError);

      // Ready → publishes once.
      const first = await publishSongGroup(ownerId, readyGroupId);
      expect(first.slug).toHaveLength(8);

      // Idempotent: republishing returns the exact same slug, no second row.
      const second = await publishSongGroup(ownerId, readyGroupId);
      expect(second.slug).toBe(first.slug);
      const rows = await db.select().from(songPublications).where(eq(songPublications.songGroupId, readyGroupId));
      expect(rows).toHaveLength(1);

      // Cross-user: the other user can never publish the owner's song.
      await expect(publishSongGroup(otherId, readyGroupId)).rejects.toThrow(MusicJobOwnershipError);

      // Public read exposes only the safe fields, for a real slug...
      const publicView = await getPublicSongBySlug(first.slug);
      expect(publicView).toEqual({
        title: "Chanson prête",
        style: null,
        occasion: null,
        coverUrl: null,
        audioUrl: "https://cdn.example.invalid/ready.mp3",
      });

      // ...and returns exactly the same `null` for a slug that never existed as for one that
      // was later unpublished (simulated here by a slug that was never inserted) — no
      // enumeration signal between the two cases.
      expect(await getPublicSongBySlug("never-existed")).toBeNull();
    } finally {
      await db.delete(songPublications).where(eq(songPublications.songGroupId, readyGroupId));
      await db.delete(musicGenerationJobs).where(eq(musicGenerationJobs.songGroupId, readyGroupId));
      await db.delete(musicGenerationJobs).where(eq(musicGenerationJobs.songGroupId, pendingGroupId));
      await db.delete(user).where(eq(user.id, ownerId));
      await db.delete(user).where(eq(user.id, otherId));
    }
  }, 30000);
});
```

- [ ] **Step 6: Lancer le test d'intégration réel**

```bash
RUN_DB_INTEGRATION_TESTS=1 npx vitest run tests/song-publish.integration.test.ts
```

Attendu : PASS. Si l'assertion `toHaveLength(8)` échoue à cause de l'encodage `base64url` (6 octets → 8 caractères, sans `=` de padding), ajuster la longueur attendue en conséquence plutôt que de changer l'implémentation.

- [ ] **Step 7: Commit**

```bash
git add lib/ai/songs.ts tests/song-publish.test.ts tests/song-publish.integration.test.ts
git commit -m "feat: ajouter la publication publique de chanson (publishSongGroup, getPublicSongBySlug)"
```

---

## Task 5: Route `POST /api/songs/[groupId]/publish`

**Files:**
- Create: `app/api/songs/[groupId]/publish/route.ts`
- Test: `tests/song-publish-route.test.ts`

**Interfaces:**
- Consumes: `publishSongGroup`, `SongNotReadyError` (Task 4), `MusicJobOwnershipError`, `rejectCrossSiteMutation`, `clientIp`, `rateLimit`, `writeAuditLog`.
- Produces: `POST` renvoie `{ url: string }`.

- [ ] **Step 1: Écrire le test de régression (échoue avant l'implémentation du fichier)**

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("POST /api/songs/[groupId]/publish", () => {
  it("guards origin, session, rate limit and ownership like the sibling songs routes", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/publish/route.ts", "utf8");
    expect(source).toContain("rejectCrossSiteMutation(request)");
    expect(source).toContain("auth.api.getSession(");
    expect(source).toContain("rateLimit(`songs:publish:");
    expect(source).toContain("groupIdSchema.safeParse(");
    expect(source).toContain("error instanceof SongNotReadyError");
    expect(source).toContain("error instanceof MusicJobOwnershipError");
    expect(source).toContain('status: 409');
    expect(source).toContain('status: 404');
  });

  it("audits the publish action and never returns raw internal fields", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/publish/route.ts", "utf8");
    expect(source).toContain('action: "musicful.song.published"');
    expect(source).not.toContain("userId:");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/song-publish-route.test.ts
```

Attendu : FAIL — le fichier n'existe pas.

- [ ] **Step 3: Créer la route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { publishSongGroup, SongNotReadyError } from "@/lib/ai/songs";
import { MusicJobOwnershipError } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();

export async function POST(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:publish:${session.user.id}:${clientIp(request)}`, 20);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  try {
    const { slug } = await publishSongGroup(session.user.id, parsedId.data);
    await writeAuditLog({
      action: "musicful.song.published",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: parsedId.data,
    });
    return NextResponse.json({ url: new URL(`/s/${slug}`, request.url).toString() });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError)
      return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });
    if (error instanceof SongNotReadyError)
      return NextResponse.json({ error: "Cette chanson n'est pas encore prête à être publiée." }, { status: 409 });
    throw error;
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/song-publish-route.test.ts
```

Attendu : PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/songs/\[groupId\]/publish/route.ts tests/song-publish-route.test.ts
git commit -m "feat: ajouter la route POST /api/songs/[groupId]/publish"
```

---

## Task 6: Route `PATCH /api/songs/[groupId]/cover`

**Files:**
- Create: `app/api/songs/[groupId]/cover/route.ts`
- Test: `tests/song-cover-route.test.ts`

**Interfaces:**
- Consumes: `setSongGroupCover` (Task 3), `isTrustedImageUrl` (Task 2), `MusicJobOwnershipError`, mêmes gardes de sécurité que Task 5.
- Produces: `PATCH` renvoie `{ coverUrl: string }`.

- [ ] **Step 1: Écrire le test de régression**

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("PATCH /api/songs/[groupId]/cover", () => {
  it("rejects an untrusted image host before persisting it", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/cover/route.ts", "utf8");
    expect(source).toContain("isTrustedImageUrl(parsedBody.data.coverUrl)");
    expect(source).toContain('status: 400');
  });

  it("guards origin, content type, session, rate limit and ownership", async () => {
    const source = await fs.readFile("app/api/songs/[groupId]/cover/route.ts", "utf8");
    expect(source).toContain("rejectCrossSiteMutation(request)");
    expect(source).toContain('requireContentType(request, "application/json")');
    expect(source).toContain("auth.api.getSession(");
    expect(source).toContain("rateLimit(`songs:cover:");
    expect(source).toContain("error instanceof MusicJobOwnershipError");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/song-cover-route.test.ts
```

Attendu : FAIL — le fichier n'existe pas.

- [ ] **Step 3: Créer la route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setSongGroupCover } from "@/lib/ai/songs";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";
import { MusicJobOwnershipError } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();
const coverSchema = z.object({ coverUrl: z.string().url() });

export async function PATCH(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:cover:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsedBody = coverSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  if (!isTrustedImageUrl(parsedBody.data.coverUrl))
    return NextResponse.json({ error: "Cette image n'est pas hébergée sur un domaine autorisé." }, { status: 400 });

  try {
    await setSongGroupCover(session.user.id, parsedId.data, parsedBody.data.coverUrl);
    return NextResponse.json({ coverUrl: parsedBody.data.coverUrl });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError)
      return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });
    throw error;
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/song-cover-route.test.ts
```

Attendu : PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/songs/\[groupId\]/cover/route.ts tests/song-cover-route.test.ts
git commit -m "feat: ajouter la route PATCH /api/songs/[groupId]/cover"
```

---

## Task 7: Traduire les messages d'erreur de l'upload d'images

**Files:**
- Modify: `app/api/uploads/images/route.ts:24,34,35,40,48`

**Interfaces:**
- Aucun changement de contrat : mêmes codes HTTP, mêmes clés JSON (`error`), seule la valeur du message change.

Cette route existait déjà mais n'avait jamais de consommateur réel (confirmée en exploration) ; le bouton Poster (Task 10) en fait le premier appelant côté utilisateur final, d'où la mise en conformité avec la règle de langue obligatoire (CLAUDE.md).

- [ ] **Step 1: Écrire le test de régression (échoue avant la traduction)**

Créer `tests/uploads-images-french-errors.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("Upload d'image — messages en français", () => {
  it("n'a plus de message d'erreur en anglais", async () => {
    const source = await fs.readFile("app/api/uploads/images/route.ts", "utf8");
    expect(source).not.toContain('"Unauthorized"');
    expect(source).not.toContain('"Too many upload requests"');
    expect(source).not.toContain('"Cloudinary is not enabled"');
    expect(source).not.toContain('"Image file is required"');
    expect(source).not.toContain('"Image upload failed"');
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/uploads-images-french-errors.test.ts
```

Attendu : FAIL (les 5 messages anglais sont encore présents).

- [ ] **Step 3: Traduire**

Dans `app/api/uploads/images/route.ts`, remplacer chacun des 5 messages :

- Ligne 24 : `{ error: "Unauthorized" }` → `{ error: "Authentification requise." }`
- Ligne 33 : `{ error: "Security rate-limit backend unavailable" }` → `{ error: "Le contrôle de débit est indisponible." }`
- Ligne 34 : `{ error: "Too many upload requests" }` → `{ error: "Trop de requêtes. Réessaie dans un instant." }`
- Ligne 35 : `{ error: "Cloudinary is not enabled" }` → `{ error: "L'envoi d'image n'est pas disponible pour le moment." }`
- Ligne 40 : `{ error: "Image file is required", ... }` → `{ error: "Un fichier image est requis.", ... }`
- Ligne 47-48 : `error instanceof Error ? error.message : "Image upload failed"` → `error instanceof Error ? error.message : "L'envoi de l'image a échoué."`

- [ ] **Step 4: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/uploads-images-french-errors.test.ts
```

Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/uploads/images/route.ts tests/uploads-images-french-errors.test.ts
git commit -m "fix: traduire les messages d'erreur de l'upload d'image en français"
```

---

## Task 8: Page publique `app/s/[slug]`

**Files:**
- Create: `app/s/[slug]/page.tsx`
- Create: `app/s/[slug]/PublicSongPlayer.tsx`
- Create: `app/s/[slug]/not-found.tsx`
- Test: `tests/public-song-page.test.ts`

**Interfaces:**
- Consumes: `getPublicSongBySlug` (Task 4), `buildMetadata` (`lib/seo/metadata.ts`, déjà existant).
- Produces: route publique `GET /s/[slug]` sans authentification.

- [ ] **Step 1: Écrire le test de régression (échoue avant l'implémentation)**

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("Public song page /s/[slug]", () => {
  it("never renders a distinguishable result for missing vs. unpublished (calls notFound() whenever getPublicSongBySlug returns null)", async () => {
    const source = await fs.readFile("app/s/[slug]/page.tsx", "utf8");
    expect(source).toContain("const song = await getPublicSongBySlug(slug);");
    expect(source).toContain("if (!song) notFound();");
  });

  it("uses buildMetadata for Open Graph previews (social sharing)", async () => {
    const source = await fs.readFile("app/s/[slug]/page.tsx", "utf8");
    expect(source).toContain("buildMetadata({");
    expect(source).toContain("image: song.coverUrl ?? undefined,");
  });

  it("never exposes a download control to anonymous listeners", async () => {
    const source = await fs.readFile("app/s/[slug]/PublicSongPlayer.tsx", "utf8");
    expect(source).toContain('controlsList="nodownload"');
    // Checks for a standalone `download` HTML attribute (a leading space, as in `<a download>`
    // or `<audio download>`) — not present here since "nodownload" above has no space before it.
    expect(source).not.toContain(" download");
    expect(source).not.toContain("<a ");
  });

  it("has a dedicated not-found page instead of the raw Next.js 404", async () => {
    const source = await fs.readFile("app/s/[slug]/not-found.tsx", "utf8");
    expect(source).toContain("Chanson indisponible");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/public-song-page.test.ts
```

Attendu : FAIL — aucun des 3 fichiers n'existe.

- [ ] **Step 3: Créer `app/s/[slug]/PublicSongPlayer.tsx`**

```tsx
"use client";

export default function PublicSongPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  return (
    <audio
      controls
      controlsList="nodownload"
      onContextMenu={(event) => event.preventDefault()}
      src={audioUrl}
      aria-label={title}
      className="w-full"
    />
  );
}
```

`controlsList="nodownload"` masque l'option de téléchargement native de Chrome/Edge — ce n'est pas une protection cryptographique (un visiteur techniquement motivé peut toujours récupérer le flux via les outils réseau), limite assumée et documentée dans la spec.

- [ ] **Step 4: Créer `app/s/[slug]/not-found.tsx`**

```tsx
export default function PublicSongNotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 text-center font-body">
      <h1 className="font-headings font-bold text-xl text-foreground mb-2">Chanson indisponible</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Ce lien n'existe plus ou n'est plus accessible publiquement.
      </p>
      <a href="/" className="font-semibold text-foreground underline">
        Découvrir MusikPro
      </a>
    </main>
  );
}
```

- [ ] **Step 5: Créer `app/s/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSongBySlug } from "@/lib/ai/songs";
import PublicSongPlayer from "./PublicSongPlayer";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const song = await getPublicSongBySlug(slug);
  if (!song) return buildMetadata({ title: "Chanson indisponible", path: `/s/${slug}`, noIndex: true });
  return buildMetadata({
    title: `${song.title} — écoute sur MusikPro`,
    description: song.occasion
      ? `Une chanson créée pour ${song.occasion} avec MusikPro.`
      : "Une chanson créée avec MusikPro.",
    path: `/s/${slug}`,
    image: song.coverUrl ?? undefined,
  });
}

export default async function PublicSongPage({ params }: Params) {
  const { slug } = await params;
  const song = await getPublicSongBySlug(slug);
  if (!song) notFound();

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 font-body">
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="aspect-square w-full bg-muted">
          {song.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="p-5 flex flex-col gap-3">
          <h1 className="font-headings font-bold text-xl text-foreground truncate">{song.title}</h1>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {song.style ? <span className="font-semibold">{song.style}</span> : null}
            {song.occasion ? <span>· {song.occasion}</span> : null}
          </div>
          <PublicSongPlayer audioUrl={song.audioUrl} title={song.title} />
        </div>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Créé avec{" "}
        <a href="/" className="font-semibold text-foreground underline">
          MusikPro
        </a>
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/public-song-page.test.ts
```

Attendu : PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add app/s tests/public-song-page.test.ts
git commit -m "feat: ajouter la page publique /s/[slug] (lecture sans compte, sans téléchargement)"
```

---

## Task 9: Câblage client — types, `DemoProvider`, actions partagées

**Files:**
- Modify: `lib/demo/song-types.ts:15-24`
- Modify: `lib/demo/audio-actions.ts:34-49`
- Create: `lib/demo/cover-actions.ts`
- Modify: `components/banani/DemoProvider.tsx:22-40` (`SongGroupResponse`), `:42-67` (`mapSongGroup`), `:669-690` (nouvelles actions)
- Test: `tests/musikpro-demo.test.ts` (étendu — vérifier son contenu actuel avant d'ajouter, voir Step 1)

**Interfaces:**
- Consumes: `apiFetch`, `ApiClientError` (déjà importés dans `DemoProvider.tsx`).
- Produces: `WorkspaceSong.coverUrl?: string | null`, `shareLink(url, title, text)`, `uploadCoverImage(file): Promise<string>`, `demo.publishSong(id): Promise<string | null>`, `demo.setSongCover(id, coverUrl): Promise<boolean>`.

- [ ] **Step 1: Lire le test existant pour connaître son style avant d'y ajouter des cas**

```bash
sed -n '1,40p' tests/musikpro-demo.test.ts
```

(Ce fichier teste déjà la logique de `DemoProvider`/données démo — s'aligner sur son style d'import et d'assertions pour les nouveaux cas ajoutés au Step 7.)

- [ ] **Step 2: `lib/demo/song-types.ts` — ajouter `coverUrl`**

```ts
export type WorkspaceSong = {
  id: string | number;
  title: string;
  occasion: string;
  style: string;
  date: string;
  lyrics: string;
  status?: "processing" | "completed" | "failed";
  coverUrl?: string | null;
  versions: WorkspaceSongVersion[];
};
```

- [ ] **Step 3: Écrire le test de non-régression pour `shareAudioFile`/`shareLink` (échoue avant le refactor — `shareLink` n'existe pas encore)**

Créer `tests/audio-actions-share-link.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { shareAudioFile, shareLink } from "@/lib/demo/audio-actions";

describe("shareLink / shareAudioFile", () => {
  it("shareAudioFile still shares the exact same text as before the refactor", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const result = await shareAudioFile("https://cdn.example/song.mp3", "Ma chanson");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Ma chanson",
      text: "Écoute cette chanson créée sur MusikPro !",
      url: "https://cdn.example/song.mp3",
    });
    vi.unstubAllGlobals();
  });

  it("shareLink shares a public page link with the text the caller provides", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const result = await shareLink("https://app.example/s/abc", "Ma chanson", "Écoute ma chanson sur MusikPro !");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "Ma chanson",
      text: "Écoute ma chanson sur MusikPro !",
      url: "https://app.example/s/abc",
    });
    vi.unstubAllGlobals();
  });

  it("falls back to clipboard copy when the Web Share API is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const result = await shareLink("https://app.example/s/abc", "Titre", "texte");
    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://app.example/s/abc");
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 4: Lancer le test pour vérifier l'échec**

```bash
npx vitest run tests/audio-actions-share-link.test.ts
```

Attendu : FAIL — `shareLink` n'est pas exporté par `lib/demo/audio-actions.ts`.

- [ ] **Step 5: `lib/demo/audio-actions.ts` — extraire `shareLink` (refactor sans changement de comportement)**

Remplacer la fonction `shareAudioFile` existante (lignes 34-49) par :

```ts
export async function shareLink(
  url: string,
  title: string,
  text: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

export async function shareAudioFile(audioUrl: string, title: string) {
  return shareLink(audioUrl, title, "Écoute cette chanson créée sur MusikPro !");
}
```

- [ ] **Step 6: Lancer le test pour vérifier le succès**

```bash
npx vitest run tests/audio-actions-share-link.test.ts
```

Attendu : PASS (3 tests) — confirme que `shareAudioFile` partage exactement le même texte qu'avant le refactor.

- [ ] **Step 7: Créer `lib/demo/cover-actions.ts`**

```ts
import { apiFetch } from "@/lib/api/client";

export async function uploadCoverImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const result = await apiFetch<{ url: string }>("/api/uploads/images", { method: "POST", body: form });
  return result.url;
}
```

- [ ] **Step 8: `components/banani/DemoProvider.tsx` — exposer `coverUrl` bout en bout**

Modifier `SongGroupResponse` (lignes 22-40), ajouter `coverUrl` après `createdAt` :

```ts
type SongGroupResponse = {
  songGroupId: string;
  title: string;
  occasion: string | null;
  style: string | null;
  lyrics: string | null;
  status: "processing" | "completed" | "failed";
  createdAt: string;
  coverUrl: string | null;
  versions: Array<{
    jobId: string;
    label: string;
    status: WorkspaceSong["versions"][number]["status"];
    duration: string;
    audioUrl: string | null;
    plays: number;
    liked: boolean;
    failureReason: string | null;
  }>;
};
```

Modifier `mapSongGroup` (lignes 42-67) pour propager le champ :

```ts
function mapSongGroup(song: SongGroupResponse): WorkspaceSong {
  return {
    id: song.songGroupId,
    title: song.title,
    occasion: song.occasion || "",
    style: song.style || "",
    date: new Date(song.createdAt).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    lyrics: song.lyrics || "",
    status: song.status,
    coverUrl: song.coverUrl,
    versions: song.versions.map((v) => ({
      jobId: v.jobId,
      label: v.label,
      duration: v.duration,
      plays: v.plays,
      liked: v.liked,
      status: v.status,
      audioUrl: v.audioUrl,
      failureReason: v.failureReason,
    })),
  };
}
```

- [ ] **Step 9: `components/banani/DemoProvider.tsx` — ajouter `publishSong`/`setSongCover`**

Dans l'objet retourné par `useDemoState` (après `removeSong: async (id) => {...},`, avant `go, exitAccount,` — lignes 686-690), ajouter :

```ts
    publishSong: async (id: string | number): Promise<string | null> => {
      if (isDemo) {
        notify("Action de démonstration : aucune opération réelle effectuée.");
        return null;
      }
      try {
        const result = await apiFetch<{ url: string }>(`/api/songs/${id}/publish`, { method: "POST" });
        return result.url;
      } catch (error) {
        notify(error instanceof ApiClientError ? error.message : "Impossible de publier cette chanson pour le moment.");
        return null;
      }
    },
    setSongCover: async (id: string | number, coverUrl: string): Promise<boolean> => {
      if (isDemo) {
        notify("Action de démonstration : aucune opération réelle effectuée.");
        return false;
      }
      try {
        await apiFetch(`/api/songs/${id}/cover`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverUrl }),
        });
        await refreshSongs();
        notify("Pochette mise à jour.");
        return true;
      } catch {
        notify("Impossible de mettre à jour la pochette pour le moment.");
        return false;
      }
    },
```

- [ ] **Step 10: Étendre `tests/musikpro-demo.test.ts`**

Ajouter (en respectant le style constaté au Step 1) un test qui vérifie que `mapSongGroup` propage bien `coverUrl` — par exemple, si le fichier teste déjà des fonctions pures exportées, ajouter :

```ts
it("propagates coverUrl through the real-mode song mapping", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile("components/banani/DemoProvider.tsx", "utf8"),
  );
  expect(source).toContain("coverUrl: song.coverUrl,");
  expect(source).toContain("coverUrl: string | null;");
});
```

(`DemoProvider.tsx` est un composant client important qui, comme `lib/ai/songs.ts`, n'est pas conçu pour un import isolé en test — régression statique cohérente avec le reste de la suite.)

- [ ] **Step 11: Lancer tous les tests touchés**

```bash
npx vitest run tests/musikpro-demo.test.ts tests/audio-actions-share-link.test.ts
```

Attendu : PASS.

- [ ] **Step 12: Commit**

```bash
git add lib/demo/song-types.ts lib/demo/audio-actions.ts lib/demo/cover-actions.ts components/banani/DemoProvider.tsx tests/audio-actions-share-link.test.ts tests/musikpro-demo.test.ts
git commit -m "feat: brancher coverUrl, publishSong et setSongCover dans DemoProvider"
```

---

## Task 10: Rangée de boutons dans `MySongsGeneratedScreen.tsx`

**Files:**
- Modify: `components/banani/MySongsGeneratedScreen.tsx`

**Interfaces:**
- Consumes: `demo.publishSong`, `demo.setSongCover` (Task 9), `shareLink` (Task 9), `uploadCoverImage` (Task 9), `shareVersion`/`downloadVersion` (déjà présents dans ce fichier).

- [ ] **Step 1: Mettre à jour les imports (ligne 1-6)**

```tsx
"use client";
import { translate as t } from "@/lib/i18n/translate";
import { matchesSongSearch } from "@/lib/demo/search";
import { downloadAudioFile, shareAudioFile, shareLink } from "@/lib/demo/audio-actions";
import { uploadCoverImage } from "@/lib/demo/cover-actions";
import SearchField from "./SearchField";
import { useDemo } from "./DemoProvider";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
```

- [ ] **Step 2: Ajouter l'état pour l'upload de poster (après `audioRef`, ligne 31)**

```ts
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [coverTargetId, setCoverTargetId] = useState<string | number | null>(null);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | number | null>(null);
```

- [ ] **Step 3: Ajouter les handlers (après `shareVersion`, ligne 75, avant `totalPlays`)**

```ts
  const publishCard = async (song: (typeof demo.songs)[number]) => {
    const primary = song.versions[0];
    if (demo.isDemo) {
      demo.notify("Action de démonstration : aucune opération réelle effectuée.");
      return;
    }
    if (!primary?.audioUrl) {
      demo.notify("Cette chanson n'est pas encore prête à être publiée.");
      return;
    }
    const url = await demo.publishSong(song.id);
    if (!url) return;
    const result = await shareLink(url, song.title, "Écoute ma chanson créée sur MusikPro !");
    if (result === "copied") demo.notify("Lien public copié dans le presse-papiers.");
    if (result === "shared") demo.notify("Chanson publiée et partagée !");
    if (result === "failed") demo.notify(`Chanson publiée : ${url}`);
  };

  const openPosterPicker = (songId: string | number) => {
    if (demo.isDemo) {
      demo.notify("Action de démonstration : aucune opération réelle effectuée.");
      return;
    }
    setCoverTargetId(songId);
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || coverTargetId === null) return;
    setUploadingCoverId(coverTargetId);
    try {
      const url = await uploadCoverImage(file);
      await demo.setSongCover(coverTargetId, url);
    } catch {
      demo.notify("Impossible d'envoyer cette image pour le moment.");
    } finally {
      setUploadingCoverId(null);
      setCoverTargetId(null);
    }
  };
```

- [ ] **Step 4: Convertir le `.map` des chansons en corps de bloc (ligne 166)**

Remplacer :

```tsx
        {generatedSongs.map((song) => (
          <div
```

par :

```tsx
        {generatedSongs.map((song) => {
          const primaryVersion = song.versions[0];
          return (
          <div
```

Et à la toute fin du `.map` (après la fermeture du `</div>` de la carte, avant `))}` ligne 358-359), fermer le bloc :

```tsx
          </div>
          );
        })}
```

- [ ] **Step 5: Insérer la nouvelle rangée de boutons (après la fermeture du bloc Versions, ligne 317, avant le commentaire `{/* Card Footer Actions */}`)**

```tsx
            {/* Divider */}
            <div className="border-t border-border mx-4" />

            {/* Share / Publish / Download / Poster */}
            <div className="song-share-actions px-4 pt-3 flex items-center gap-2">
              <button
                type="button"
                data-demo-ready="true"
                disabled={!demo.isDemo && !primaryVersion?.audioUrl}
                onClick={() => {
                  if (demo.isDemo) {
                    demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                  } else if (!primaryVersion?.audioUrl) {
                    demo.notify("Cette chanson n'est pas encore prête à être partagée.");
                  } else {
                    void shareVersion(song.title, primaryVersion.label, primaryVersion.audioUrl);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full bg-coral text-white px-3 py-2 text-xs font-semibold ${!demo.isDemo && !primaryVersion?.audioUrl ? "opacity-50" : ""}`}
              >
                <Icon i="share-2" size={14} />
                {t("Partager")}
              </button>
              <button
                type="button"
                data-demo-ready="true"
                disabled={!demo.isDemo && !primaryVersion?.audioUrl}
                onClick={() => void publishCard(song)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background px-3 py-2 text-xs font-semibold ${!demo.isDemo && !primaryVersion?.audioUrl ? "opacity-50" : ""}`}
              >
                <Icon i="globe" size={14} />
                {t("Publier")}
              </button>
              <button
                type="button"
                data-demo-ready="true"
                disabled={!demo.isDemo && !primaryVersion?.audioUrl}
                onClick={() => {
                  if (demo.isDemo) {
                    demo.notify("Action de démonstration : aucune opération réelle effectuée.");
                  } else if (!primaryVersion?.audioUrl) {
                    demo.notify("Cette chanson n'est pas encore prête à être téléchargée.");
                  } else {
                    void downloadVersion(song.title, primaryVersion.label, primaryVersion.audioUrl);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border bg-input px-3 py-2 text-xs font-semibold text-foreground ${!demo.isDemo && !primaryVersion?.audioUrl ? "opacity-50" : ""}`}
              >
                <Icon i="download" size={14} />
                {t("Télécharger")}
              </button>
            </div>
            <div className="song-poster-action px-4 pt-2 pb-3">
              <button
                type="button"
                data-demo-ready="true"
                disabled={uploadingCoverId === song.id}
                onClick={() => openPosterPicker(song.id)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-full border border-dashed border-border bg-input px-3 py-2 text-xs font-semibold text-foreground ${uploadingCoverId === song.id ? "opacity-50" : ""}`}
              >
                <Icon
                  i={uploadingCoverId === song.id ? "loader-circle" : "image"}
                  size={14}
                  className={uploadingCoverId === song.id ? "animate-spin" : ""}
                />
                {t("Poster")}
              </button>
            </div>
```

- [ ] **Step 6: Ajouter une petite pochette dans l'en-tête de carte (dans le bloc `{/* Card Header */}`, après la ligne du titre `<h2 ...>`, ligne 176)**

```tsx
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                {song.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : null}
                <h2 className="font-headings font-bold text-base text-foreground truncate">{song.title}</h2>
              </div>
```

- [ ] **Step 7: Ajouter le `<input>` fichier caché, partagé par toutes les cartes (juste avant `<MobileBottomNav .../>`, ligne 361)**

```tsx
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => void handleCoverFileChange(event)}
        className="hidden"
      />
      <MobileBottomNav activeTab={t("Mes chansons")} />
```

- [ ] **Step 8: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : aucune nouvelle erreur (en particulier sur le type `(typeof demo.songs)[number]` de `publishCard` et sur `ChangeEvent<HTMLInputElement>` du handler).

- [ ] **Step 9: Commit**

```bash
git add components/banani/MySongsGeneratedScreen.tsx
git commit -m "feat: ajouter la rangée Partager/Publier/Télécharger/Poster sur la carte chanson"
```

---

## Task 11: i18n + vérification finale + test navigateur réel

**Files:**
- Modify: `lib/i18n/locales/en.json`, `lib/i18n/locales/es.json`, `lib/i18n/locales/pt.json` (générés par le script, pas de contenu à écrire à la main)

- [ ] **Step 1: Synchroniser les traductions**

```bash
npm run i18n:sync
```

Vérifie que toutes les nouvelles chaînes (« Partager », « Publier », « Télécharger », « Poster », « Pochette mise à jour. », « Lien public copié dans le presse-papiers. », « Chanson publiée et partagée ! », « Cette chanson n'est pas encore prête à être partagée/publiée/téléchargée. », « Impossible d'envoyer cette image pour le moment. », « Chanson indisponible », « Découvrir MusikPro », « Créé avec MusikPro ») ont été ajoutées aux 3 fichiers de locale par l'IA déjà connectée.

- [ ] **Step 2: Vérifier l'exhaustivité i18n**

```bash
npm run i18n:check
```

Attendu : PASS (aucune clé manquante).

- [ ] **Step 3: Lancer toute la suite de tests unitaires**

```bash
npm test
```

Attendu : PASS, y compris tous les nouveaux fichiers de test des Tasks 1 à 10 (le test d'intégration réel de Task 4 est ignoré par défaut, `RUN_DB_INTEGRATION_TESTS` n'étant pas positionné dans `npm test`).

- [ ] **Step 4: Lancer les contrôles du kit**

```bash
npm run kit:integrity
npm run kit:audit
npm run typecheck
npm run lint
```

Attendu : PASS. Corriger toute régression avant de continuer (règle obligatoire CLAUDE.md).

- [ ] **Step 5: Vérification navigateur — style en mode démo**

```bash
npm run dev
```

Ouvrir `/dashboard/songs` en session démo (sans connexion), confirmer visuellement : les 4 boutons apparaissent sous chaque chanson, avec icône + texte pour les 4 (y compris Télécharger, contrairement à la capture d'origine), cliquer chacun affiche bien le message de démonstration, aucune erreur console.

- [ ] **Step 6: Vérification navigateur — flux réel (DB et Cloudinary déjà configurés dans cet environnement)**

Avec un compte de test ayant au moins une chanson dont une version est `"completed"` :
1. Cliquer Publier → confirmer le lien `/s/<slug>` est bien créé (toast de confirmation) et que recliquer Publier renvoie le même lien.
2. Ouvrir ce lien dans une fenêtre de navigation privée (sans cookies de session) → confirmer que la chanson se lit sans connexion, qu'aucune option de téléchargement n'apparaît dans les contrôles du lecteur, et que l'aperçu Open Graph (balise `<meta property="og:image">`, visible via l'inspecteur ou un validateur de carte sociale) pointe vers la pochette.
3. Cliquer Poster, envoyer une image → confirmer que la pochette apparaît dans l'en-tête de carte et, après rafraîchissement du lien public déjà ouvert, sur la page publique également.
4. Modifier manuellement l'URL du lien public avec un slug inventé → confirmer que la page « Chanson indisponible » s'affiche (pas une 404 Next brute).

- [ ] **Step 7: Lancer le test d'intégration réel de Task 4 si ce n'est pas déjà fait**

```bash
RUN_DB_INTEGRATION_TESTS=1 npx vitest run tests/song-publish.integration.test.ts
```

- [ ] **Step 8: Commit final (si des ajustements ont été nécessaires suite à la vérification navigateur)**

```bash
git add -A
git commit -m "chore: synchroniser les traductions i18n pour les nouvelles actions carte chanson"
```
