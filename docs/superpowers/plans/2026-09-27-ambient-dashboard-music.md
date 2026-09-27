# Musique d'ambiance sur le tableau de bord — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une musique de fond automatique et discrète sur la page d'accueil du tableau de bord MusikPro (démo publique et comptes réels), choisie par l'administrateur parmi ses propres chansons, avec une bande de contrôle (lecture/pause + muet) qui s'arrête automatiquement dès que la personne quitte l'accueil.

**Architecture:** Un réglage global unique en base (table singleton, même convention que `payment_bypass_settings`), une page admin pour choisir la chanson et le volume, et un unique composant client `AmbientPlayerBar` monté une seule fois en frère des arborescences mobile/desktop de la page d'accueil (jamais dupliqué à l'intérieur des deux, sous peine de double lecture audio simultanée — les deux sont déjà montées en même temps dans le DOM, seule leur visibilité change par CSS).

**Tech Stack:** Next.js App Router (Server Actions), Drizzle ORM/Neon Postgres, Zod, Vitest (environnement `node`, pas de DOM/testing-library disponible dans ce dépôt), Lucide (`Icon`), CSS déjà existant (`.song-inline-waveform`/`musik-inline-wave`).

**Spec:** `docs/superpowers/specs/2026-09-27-ambient-dashboard-music-design.md`

## Global Constraints

- Toute chaîne fixe visible côté utilisateur passe par `t(...)`/`translateTemplate(...)` (`lib/i18n/translate.ts`) ; le titre de la chanson elle-même n'est jamais traduit (contenu généré par l'utilisateur). Après implémentation : `npm run i18n:sync` puis `npm run i18n:check`.
- Toute entrée non fiable (formulaire admin) validée côté serveur avec Zod — jamais une confiance aveugle dans `formData`.
- Tout bouton du dashboard admin qui enregistre/active/désactive utilise `AdminActionForm` + le toast partagé (`useAdminActionToast`), jamais un `<form action={fn}>` brut.
- Changements additifs, isolés, réversibles : aucune route, contrat API ou table existante modifiée.
- Volume borné strictement à 5–50 (jamais 0 — c'est `enabled=false` ou le bouton muet ; jamais au-delà de 50 — le fond sonore ne doit jamais dominer), appliqué à la fois côté Zod (serveur) et en attribut HTML `min`/`max` (défense en profondeur, pas une garantie).
- Vivier de chansons éligibles : uniquement celles du compte admin actuellement connecté (`session.user.id`), jamais celles d'un autre utilisateur.
- Lecture uniquement sur la page d'accueil stricte `/dashboard` (démo publique **et** comptes réels identiquement, aucune branche `isDemo`) — silence partout ailleurs, y compris toutes les pages de création.
- Un seul élément `<audio>` et un seul composant `AmbientPlayerBar`, monté une seule fois en frère de `.banani-mobile`/`.banani-desktop` dans `app/dashboard/page.tsx` — jamais à l'intérieur de `UserDashboardMobile`/`UserDashboardDesktop` (les deux sont montés simultanément dans le DOM, dupliquer l'audio y jouerait deux fois en même temps).
- Ce dépôt n'a pas de DOM/testing-library (`vitest.config.ts` : `environment: "node"`) : la logique testable automatiquement doit être extraite en fonctions pures ; le rendu JSX réel (montage, événements `<audio>`) se vérifie manuellement au navigateur, pas par un test de composant qui n'existe nulle part ailleurs dans ce dépôt.

## Review Focus

- Le navigateur refuse l'autoplay avec son (politique Chrome/Safari sans interaction préalable) → repli automatique en muet, jamais de crash ni de son qui reste bloqué silencieusement sans moyen de l'activer. Test : Task 6.
- La chanson source est supprimée ou son URL audio devient invalide après configuration → la bande se masque proprement, jamais de son cassé qui boucle des erreurs. Test : Task 6 (cas structurel) + vérification manuelle Task 9 (cas réel navigateur).
- L'administrateur soumet le formulaire sans avoir choisi de chanson (select resté vide) → rejeté proprement par Zod, jamais de ligne "vide"/incohérente enregistrée en base. Test : Task 2.
- Un volume hors bornes (0, 51, négatif, valeur non numérique) est soumis directement à l'action serveur (pas seulement via le curseur du formulaire) → toujours rejeté par Zod, jamais un volume assourdissant enregistré. Test : Task 2.
- La bande de lecture est un jour dupliquée dans `UserDashboardMobile` et `UserDashboardDesktop` (régression future, ex. quelqu'un "harmonise" les deux écrans) → double lecture audio simultanée ; empêché structurellement par l'emplacement choisi et gardé par un test de régression statique. Test : Task 8.

---

## Task 1: Table de réglage global `ambient_background_track`

**Files:**
- Modify: `db/schema/index.ts` (ajouter la table à la suite de `paymentBypassSettings`, ligne ~330)
- Create: migration générée par `npm run db:generate` sous `db/migrations/`

**Interfaces:**
- Produces: `ambientBackgroundTrack` (table Drizzle), colonnes `id` (text, PK, défaut `"global"`), `enabled` (boolean, défaut `false`), `songGroupId` (text, nullable), `jobId` (text, nullable), `title` (text, nullable), `audioUrl` (text, nullable), `volumePercent` (integer, défaut `20`), `updatedBy` (text, référence `user.id`), `updatedAt` (timestamp, défaut `now()`).

- [ ] **Step 1: Ajouter la table au schéma**

Dans `db/schema/index.ts`, juste après le bloc `paymentBypassSettings` (avant `export const paymentCountryRoutes = pgTable(`), ajouter :

```ts
/** Réglage global unique : la chanson jouée en fond sonore sur l'accueil du tableau de bord (démo et comptes réels). */
export const ambientBackgroundTrack = pgTable("ambient_background_track", {
  id: text("id").primaryKey().default("global"),
  enabled: boolean("enabled").notNull().default(false),
  songGroupId: text("song_group_id"),
  jobId: text("job_id"),
  title: text("title"),
  audioUrl: text("audio_url"),
  volumePercent: integer("volume_percent").notNull().default(20),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Tous les imports nécessaires (`pgTable`, `text`, `boolean`, `integer`, `timestamp`, `user`) sont déjà en tête du fichier — aucun nouvel import à ajouter.

- [ ] **Step 2: Générer la migration**

Run: `npm run db:generate`

Expected: un nouveau fichier `db/migrations/00XX_<nom_généré>.sql` créé, contenant un `CREATE TABLE "ambient_background_track"` avec les colonnes ci-dessus, et une entrée ajoutée dans `db/migrations/meta/_journal.json`. Aucune connexion base n'est nécessaire pour cette commande (introspection du schéma TypeScript).

- [ ] **Step 3: Appliquer la migration en développement**

Run: `npm run db:migrate`

Expected: PASS, la table apparaît dans la branche Neon `development` déjà configurée dans `.env.local` de cet environnement.

- [ ] **Step 4: Commit**

```bash
git add db/schema/index.ts db/migrations/
git commit -m "feat: ajouter la table de réglage musique d'ambiance"
```

---

## Task 2: Validation Zod du formulaire admin

**Files:**
- Create: `lib/validation/ambient-track.ts`
- Test: `tests/ambient-track-validation.test.ts`

**Interfaces:**
- Consumes: rien (module autonome, importable sans `"server-only"` pour rester testable directement).
- Produces: `setAmbientTrackSchema` (objet Zod `{ songGroupId: string; volumePercent: number }`), utilisé par Task 4.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/ambient-track-validation.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { setAmbientTrackSchema } from "@/lib/validation/ambient-track";

describe("setAmbientTrackSchema", () => {
  it("accepte une chanson choisie et un volume dans les bornes", () => {
    const result = setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: "20" });
    expect(result).toEqual({ songGroupId: "grp_1", volumePercent: 20 });
  });

  it("rejette un songGroupId vide", () => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "", volumePercent: "20" })).toThrow();
  });

  it.each([0, 4, 51, 100, -5])("rejette un volumePercent hors bornes : %d", (volumePercent) => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: String(volumePercent) })).toThrow();
  });

  it.each([5, 20, 50])("accepte un volumePercent aux bornes ou au milieu : %d", (volumePercent) => {
    const result = setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: String(volumePercent) });
    expect(result.volumePercent).toBe(volumePercent);
  });

  it("rejette un volumePercent non numérique", () => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: "abc" })).toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run tests/ambient-track-validation.test.ts`
Expected: FAIL avec une erreur du type "Failed to resolve import @/lib/validation/ambient-track" (le fichier n'existe pas encore).

- [ ] **Step 3: Implémenter le schéma**

Créer `lib/validation/ambient-track.ts` :

```ts
import { z } from "zod";

export const setAmbientTrackSchema = z.object({
  songGroupId: z.string().min(1, "Choisis une chanson."),
  volumePercent: z.coerce.number().int().min(5).max(50),
});
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run tests/ambient-track-validation.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validation/ambient-track.ts tests/ambient-track-validation.test.ts
git commit -m "feat: valider le formulaire de musique d'ambiance avec Zod"
```

---

## Task 3: Lecture du réglage global (`getAmbientTrackStatus`)

**Files:**
- Create: `lib/settings/ambient-track.ts`

**Interfaces:**
- Consumes: `ambientBackgroundTrack` (Task 1, `@/db/schema`).
- Produces: `type AmbientTrackStatus = { enabled: boolean; songGroupId: string | null; title: string | null; audioUrl: string | null; volumePercent: number }` et `getAmbientTrackStatus(): Promise<AmbientTrackStatus>`, utilisés par Task 5 (page admin) et Task 8 (page d'accueil). `songGroupId` est inclus explicitement (pas seulement `title`) car deux chansons distinctes peuvent partager le même titre généré (ex. deux « Ma chanson — Anniversaire ») — la page admin doit pouvoir présélectionner la bonne option sans ambiguïté.

- [ ] **Step 1: Implémenter le lecteur**

Créer `lib/settings/ambient-track.ts` (même convention que `lib/settings/payment-bypass.ts`, sans `try/catch` avalant les erreurs : cette fonction est lue au chargement d'une page visitée par tout le monde, une vraie erreur DB doit remonter comme pour n'importe quelle autre donnée de la page) :

```ts
import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";

export type AmbientTrackStatus = {
  enabled: boolean;
  songGroupId: string | null;
  title: string | null;
  audioUrl: string | null;
  volumePercent: number;
};

const DISABLED: AmbientTrackStatus = {
  enabled: false,
  songGroupId: null,
  title: null,
  audioUrl: null,
  volumePercent: 20,
};

/** Réglage global : la chanson d'ambiance jouée sur l'accueil du tableau de bord (démo et comptes réels). */
export async function getAmbientTrackStatus(): Promise<AmbientTrackStatus> {
  const [row] = await db
    .select({
      enabled: ambientBackgroundTrack.enabled,
      songGroupId: ambientBackgroundTrack.songGroupId,
      title: ambientBackgroundTrack.title,
      audioUrl: ambientBackgroundTrack.audioUrl,
      volumePercent: ambientBackgroundTrack.volumePercent,
    })
    .from(ambientBackgroundTrack)
    .where(eq(ambientBackgroundTrack.id, "global"))
    .limit(1);
  if (!row || !row.enabled || !row.audioUrl) return DISABLED;
  return {
    enabled: true,
    songGroupId: row.songGroupId,
    title: row.title,
    audioUrl: row.audioUrl,
    volumePercent: row.volumePercent,
  };
}
```

Pas de test dédié pour cette étape : `lib/settings/payment-bypass.ts`, son équivalent direct dans ce dépôt, n'en a pas non plus — une lecture DB simple sans branche logique n'est pas unit-testée ici (vérifiée indirectement par le test d'intégration manuel de Task 9).

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS, aucune nouvelle erreur.

- [ ] **Step 3: Commit**

```bash
git add lib/settings/ambient-track.ts
git commit -m "feat: lire le réglage global de musique d'ambiance"
```

---

## Task 4: Actions serveur admin (choisir/désactiver la piste)

**Files:**
- Create: `app/admin/ambient-music/actions.ts`

**Interfaces:**
- Consumes: `setAmbientTrackSchema` (Task 2), `ambientBackgroundTrack` (Task 1), `listSongGroupsForUser` (`@/lib/ai/songs`, existant), `requireAdmin` (`@/lib/auth/session`, existant), `writeAuditLog` (`@/lib/security/audit`, existant), `actionErrorMessage` (`@/lib/admin/action-state`, existant), `AdminActionState` (`@/components/admin/useAdminActionToast`, existant).
- Produces: `setAmbientTrack(previous: AdminActionState, formData: FormData): Promise<AdminActionState>`, `disableAmbientTrack(previous: AdminActionState, formData: FormData): Promise<AdminActionState>` — les deux consommés par Task 5.

- [ ] **Step 1: Implémenter les actions**

Créer `app/admin/ambient-music/actions.ts` :

```ts
"use server";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listSongGroupsForUser } from "@/lib/ai/songs";
import { setAmbientTrackSchema } from "@/lib/validation/ambient-track";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export async function setAmbientTrack(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setAmbientTrackSchema.parse({
      songGroupId: formData.get("songGroupId"),
      volumePercent: formData.get("volumePercent"),
    });
    const groups = await listSongGroupsForUser(session.user.id);
    const group = groups.find((g) => g.songGroupId === parsed.songGroupId);
    const primary = group?.versions[0];
    if (!group || !primary?.audioUrl) throw new Error("Cette chanson n'est plus disponible.");
    const db = getServiceDb();
    const fields = {
      enabled: true,
      songGroupId: group.songGroupId,
      jobId: primary.jobId,
      title: group.title,
      audioUrl: primary.audioUrl,
      volumePercent: parsed.volumePercent,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await db
      .insert(ambientBackgroundTrack)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: ambientBackgroundTrack.id, set: fields });
    await writeAuditLog({
      action: "ambient_track.updated",
      actorId: session.user.id,
      targetType: "ambient_background_track",
      targetId: "global",
      metadata: { songGroupId: group.songGroupId, volumePercent: parsed.volumePercent },
    });
    revalidatePath("/admin/ambient-music");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Musique d'ambiance mise à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer la musique d'ambiance.") };
  }
}

export async function disableAmbientTrack(_previous: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const db = getServiceDb();
    const fields = { enabled: false, updatedBy: session.user.id, updatedAt: new Date() };
    await db
      .insert(ambientBackgroundTrack)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: ambientBackgroundTrack.id, set: fields });
    await writeAuditLog({
      action: "ambient_track.disabled",
      actorId: session.user.id,
      targetType: "ambient_background_track",
      targetId: "global",
    });
    revalidatePath("/admin/ambient-music");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Musique d'ambiance désactivée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de désactiver la musique d'ambiance.") };
  }
}
```

`disableAmbientTrack` déclare bien un second paramètre `_formData: FormData` (même non lu) : `AdminActionForm` exige la signature exacte `(previous: AdminActionState, data: FormData) => Promise<AdminActionState>`, un formulaire sans champ n'en dispense pas.

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/admin/ambient-music/actions.ts
git commit -m "feat: actions serveur pour configurer la musique d'ambiance"
```

---

## Task 5: Page admin + entrée de menu

**Files:**
- Create: `app/admin/ambient-music/page.tsx`
- Create: `components/admin/AmbientMusicPanel.tsx`
- Modify: `components/admin/AdminShell.tsx` (groupe "Configuration", ligne ~43)

**Interfaces:**
- Consumes: `getAmbientTrackStatus` (Task 3), `listSongGroupsForUser` (`@/lib/ai/songs`, existant), `extractGenreLabel` (`@/lib/ai/songs`, existant), `setAmbientTrack`/`disableAmbientTrack` (Task 4), `requireAdmin` (existant), `AdminPage`/`AdminPageHeader` (`@/components/admin/AdminPage`, existant), `AdminActionForm` (existant).
- Produces: route `/admin/ambient-music` accessible depuis le menu propriétaire.

- [ ] **Step 1: Créer le panneau client**

Créer `components/admin/AmbientMusicPanel.tsx` :

```tsx
"use client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { setAmbientTrack, disableAmbientTrack } from "@/app/admin/ambient-music/actions";
import { extractGenreLabel } from "@/lib/ai/songs";
import type { AmbientTrackStatus } from "@/lib/settings/ambient-track";

type SongOption = { songGroupId: string; title: string; style: string | null };

export default function AmbientMusicPanel({
  status,
  songOptions,
  currentSongGroupId,
}: {
  status: AmbientTrackStatus;
  songOptions: SongOption[];
  currentSongGroupId: string | null;
}) {
  if (songOptions.length === 0) {
    return (
      <section className="admin-panel">
        <p>Tu n'as encore aucune chanson terminée à utiliser comme fond sonore.</p>
      </section>
    );
  }
  return (
    <section className={`admin-panel ${status.enabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="music-4" size={20} />
        </span>
        <div>
          <h2>Musique d'ambiance du tableau de bord</h2>
          <p>
            Jouée automatiquement, à faible volume, sur l'écran d'accueil du tableau de bord (démo publique et comptes
            réels). Elle s'arrête dès que la personne quitte l'accueil.
          </p>
        </div>
        <span className={`admin-status ${status.enabled ? "is-success" : "is-pending"}`}>
          {status.enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      <AdminActionForm action={setAmbientTrack} className="admin-stack-form">
        <label htmlFor="ambient-song-select">Chanson</label>
        <select id="ambient-song-select" name="songGroupId" defaultValue={currentSongGroupId ?? ""} required>
          <option value="" disabled>
            Choisis une chanson
          </option>
          {songOptions.map((song) => (
            <option key={song.songGroupId} value={song.songGroupId}>
              {song.title}
              {song.style ? ` — ${extractGenreLabel(song.style)}` : ""}
            </option>
          ))}
        </select>
        <label htmlFor="ambient-volume-input">Volume (5 à 50 %)</label>
        <input
          id="ambient-volume-input"
          type="range"
          name="volumePercent"
          min={5}
          max={50}
          defaultValue={status.volumePercent}
        />
        <div className="admin-btn-row">
          <button type="submit" className="admin-primary-action">
            <Icon i="save" size={15} />
            Enregistrer
          </button>
        </div>
      </AdminActionForm>
      {status.enabled ? (
        <AdminActionForm action={disableAmbientTrack} className="admin-btn-row">
          <button type="submit" className="admin-secondary-action">
            <Icon i="power-off" size={15} />
            Désactiver
          </button>
        </AdminActionForm>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Créer la page serveur**

Créer `app/admin/ambient-music/page.tsx` :

```tsx
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AmbientMusicPanel from "@/components/admin/AmbientMusicPanel";
import { requireAdmin } from "@/lib/auth/session";
import { listSongGroupsForUser } from "@/lib/ai/songs";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";

export default async function AmbientMusicAdminPage() {
  const session = await requireAdmin();
  const [status, groups] = await Promise.all([
    getAmbientTrackStatus(),
    listSongGroupsForUser(session.user.id),
  ]);
  const songOptions = groups
    .filter((group) => group.status === "completed" && group.versions[0]?.audioUrl)
    .map((group) => ({ songGroupId: group.songGroupId, title: group.title, style: group.style }));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Musique d'ambiance"
        description="Choisis une de tes chansons pour qu'elle joue en fond sonore sur l'accueil du tableau de bord."
      />
      <AmbientMusicPanel status={status} songOptions={songOptions} currentSongGroupId={status.songGroupId} />
    </AdminPage>
  );
}
```

Remarque de cohérence : `currentSongGroupId` vient directement de `status.songGroupId` (Task 3), pas d'une comparaison par titre — deux chansons de ce compte peuvent déjà partager le même titre généré, ce qui rendrait un appariement par titre incorrect.

- [ ] **Step 3: Ajouter l'entrée de menu**

Dans `components/admin/AdminShell.tsx`, dans le groupe `"Configuration"` (après la ligne `{ href: "/admin/ai-providers", icon: "cpu", label: "Fournisseurs IA" },`), ajouter :

```ts
      { href: "/admin/ambient-music", icon: "music-4", label: "Musique d'ambiance" },
```

- [ ] **Step 4: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Vérifier manuellement**

Démarrer `npm run dev` si besoin, se connecter avec le compte propriétaire, ouvrir `/admin/ambient-music` : la liste déroulante doit lister les chansons terminées du compte, le curseur de volume doit être borné 5–50, "Enregistrer" doit afficher un toast de succès.

- [ ] **Step 6: Commit**

```bash
git add app/admin/ambient-music/page.tsx components/admin/AmbientMusicPanel.tsx components/admin/AdminShell.tsx
git commit -m "feat: page admin pour configurer la musique d'ambiance"
```

---

## Task 6: Logique pure du lecteur (autoplay, muet, localStorage)

**Files:**
- Create: `lib/demo/ambient-player-logic.ts`
- Test: `tests/ambient-player-logic.test.ts`

**Interfaces:**
- Consumes: rien (module pur, aucune dépendance DOM directe — reçoit une interface `Storage`-like en paramètre pour rester testable en environnement `node`).
- Produces : `AMBIENT_MUTE_STORAGE_KEY` (string), `shouldShowAmbientBar(status: { enabled: boolean; audioUrl: string | null }): boolean`, `readStoredMutePreference(storage: Pick<Storage, "getItem">): boolean`, `writeStoredMutePreference(storage: Pick<Storage, "setItem">, muted: boolean): void`, `resolveAutoplayOutcome(playSucceeded: boolean, storedMutePreference: boolean): boolean` (renvoie l'état `muted` final à appliquer à l'élément `<audio>`) — tous consommés par Task 7.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/ambient-player-logic.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  AMBIENT_MUTE_STORAGE_KEY,
  shouldShowAmbientBar,
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
} from "@/lib/demo/ambient-player-logic";

describe("shouldShowAmbientBar", () => {
  it("cache la bande si désactivé", () => {
    expect(shouldShowAmbientBar({ enabled: false, audioUrl: "https://example.com/a.mp3" })).toBe(false);
  });

  it("cache la bande si aucune URL audio", () => {
    expect(shouldShowAmbientBar({ enabled: true, audioUrl: null })).toBe(false);
  });

  it("affiche la bande si activé avec une URL", () => {
    expect(shouldShowAmbientBar({ enabled: true, audioUrl: "https://example.com/a.mp3" })).toBe(true);
  });
});

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    dump: () => store,
  };
}

describe("readStoredMutePreference / writeStoredMutePreference", () => {
  it("lit false par défaut quand rien n'est stocké", () => {
    expect(readStoredMutePreference(fakeStorage())).toBe(false);
  });

  it("lit true quand la préférence a été écrite", () => {
    const storage = fakeStorage({ [AMBIENT_MUTE_STORAGE_KEY]: "1" });
    expect(readStoredMutePreference(storage)).toBe(true);
  });

  it("écrit puis relit la préférence muette", () => {
    const storage = fakeStorage();
    writeStoredMutePreference(storage, true);
    expect(storage.dump()[AMBIENT_MUTE_STORAGE_KEY]).toBe("1");
    expect(readStoredMutePreference(storage)).toBe(true);
  });

  it("écrit puis relit la préférence non muette", () => {
    const storage = fakeStorage({ [AMBIENT_MUTE_STORAGE_KEY]: "1" });
    writeStoredMutePreference(storage, false);
    expect(readStoredMutePreference(storage)).toBe(false);
  });
});

describe("resolveAutoplayOutcome", () => {
  it("reste muet si le navigateur a refusé l'autoplay avec son, même sans préférence stockée", () => {
    expect(resolveAutoplayOutcome(false, false)).toBe(true);
  });

  it("respecte la préférence muette de l'utilisateur même si l'autoplay avec son a réussi", () => {
    expect(resolveAutoplayOutcome(true, true)).toBe(true);
  });

  it("reste non muet si l'autoplay a réussi et qu'aucune préférence muette n'est stockée", () => {
    expect(resolveAutoplayOutcome(true, false)).toBe(false);
  });

  it("reste muet si l'autoplay a échoué et que l'utilisateur avait déjà choisi le son coupé", () => {
    expect(resolveAutoplayOutcome(false, true)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run tests/ambient-player-logic.test.ts`
Expected: FAIL, le module `@/lib/demo/ambient-player-logic` n'existe pas encore.

- [ ] **Step 3: Implémenter la logique pure**

Créer `lib/demo/ambient-player-logic.ts` :

```ts
export const AMBIENT_MUTE_STORAGE_KEY = "musikpro-ambient-muted";

export function shouldShowAmbientBar(status: { enabled: boolean; audioUrl: string | null }): boolean {
  return status.enabled && Boolean(status.audioUrl);
}

export function readStoredMutePreference(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(AMBIENT_MUTE_STORAGE_KEY) === "1";
}

export function writeStoredMutePreference(storage: Pick<Storage, "setItem">, muted: boolean): void {
  storage.setItem(AMBIENT_MUTE_STORAGE_KEY, muted ? "1" : "0");
}

/**
 * Décide de l'état `muted` final à appliquer à l'élément `<audio>` après une tentative
 * `play()` : si le navigateur a bloqué l'autoplay avec son, on reste muet quoi qu'il arrive
 * (le bouton son sert de rattrapage) ; sinon on respecte la préférence déjà mémorisée par
 * l'utilisateur.
 */
export function resolveAutoplayOutcome(playSucceeded: boolean, storedMutePreference: boolean): boolean {
  if (!playSucceeded) return true;
  return storedMutePreference;
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run tests/ambient-player-logic.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/demo/ambient-player-logic.ts tests/ambient-player-logic.test.ts
git commit -m "feat: logique pure du lecteur d'ambiance (autoplay, muet, localStorage)"
```

---

## Task 7: Composant `AmbientPlayerBar`

**Files:**
- Create: `components/banani/AmbientPlayerBar.tsx`
- Modify: `app/dashboard/banani.css` (nouvelle classe de positionnement, réutilise les animations existantes)

**Interfaces:**
- Consumes: `shouldShowAmbientBar`, `readStoredMutePreference`, `writeStoredMutePreference`, `resolveAutoplayOutcome`, `AMBIENT_MUTE_STORAGE_KEY` (Task 6), `Icon` (`@/components/banani/Icon`, existant), `translate as t` (`@/lib/i18n/translate`, existant).
- Produces: `export default function AmbientPlayerBar(props: { title: string | null; audioUrl: string; volumePercent: number }): JSX.Element`, consommé par Task 8. Ce composant ne vérifie PAS lui-même `shouldShowAmbientBar` — c'est à l'appelant (Task 8) de ne le monter que si la bande doit s'afficher ; une fois monté, il joue toujours (c'est tout son rôle).

- [ ] **Step 1: Implémenter le composant**

Créer `components/banani/AmbientPlayerBar.tsx` :

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";
import {
  readStoredMutePreference,
  writeStoredMutePreference,
  resolveAutoplayOutcome,
} from "@/lib/demo/ambient-player-logic";

const WAVEFORM_BARS = [6, 10, 7, 12, 8];

export default function AmbientPlayerBar({
  title,
  audioUrl,
  volumePercent,
}: {
  title: string | null;
  audioUrl: string;
  volumePercent: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(50, Math.max(5, volumePercent)) / 100;
    const storedMutePreference = readStoredMutePreference(window.localStorage);
    audio.muted = false;
    audio
      .play()
      .then(() => {
        const finalMuted = resolveAutoplayOutcome(true, storedMutePreference);
        audio.muted = finalMuted;
        setMuted(finalMuted);
      })
      .catch(() => {
        const finalMuted = resolveAutoplayOutcome(false, storedMutePreference);
        audio.muted = finalMuted;
        setMuted(finalMuted);
        void audio.play().catch(() => setLoadError(true));
      });
    return () => {
      audio.pause();
    };
    // Le volume/URL ne changent jamais pendant la vie de ce composant (démonté/remonté par
    // page.tsx à chaque changement de réglage admin via revalidatePath) : un seul montage suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    writeStoredMutePreference(window.localStorage, next);
  };

  if (loadError) return null;

  return (
    <div className="ambient-player-bar" role="status" aria-label={t("Musique d'ambiance")}>
      <audio
        ref={audioRef}
        src={audioUrl}
        loop
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
        className="sr-only"
      />
      <div className={`song-inline-waveform ambient-player-waveform ${isPlaying && !muted ? "is-playing" : ""}`}>
        {WAVEFORM_BARS.map((h, i) => (
          <div key={i} className="w-1 rounded-sm bg-primary/60" style={{ height: `${h}px` }} />
        ))}
      </div>
      {title ? <span className="ambient-player-title">{title}</span> : null}
      <button
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? t("Réactiver le son de la musique d'ambiance") : t("Couper le son de la musique d'ambiance")}
        className="ambient-player-mute-button"
      >
        <Icon i={muted ? "volume-x" : "volume-2"} size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Ajouter le style de positionnement**

Dans `app/dashboard/banani.css`, ajouter à la fin du fichier (réutilise `.song-inline-waveform`/`.is-playing`/`musik-inline-wave` déjà définis plus haut dans le même fichier — aucune nouvelle animation à écrire) :

```css
.ambient-player-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-muted-foreground);
}

.ambient-player-waveform {
  height: 16px;
  align-items: flex-end;
  gap: 2px;
}

.ambient-player-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ambient-player-mute-button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-input);
  color: var(--color-foreground);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/banani/AmbientPlayerBar.tsx app/dashboard/banani.css
git commit -m "feat: composant de lecture de la musique d'ambiance"
```

---

## Task 8: Câblage dans la page d'accueil + garde-fou anti-duplication

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test: `tests/ambient-player-bar-single-mount.test.ts`

**Interfaces:**
- Consumes: `getAmbientTrackStatus` (Task 3), `shouldShowAmbientBar` (Task 6), `AmbientPlayerBar` (Task 7).

- [ ] **Step 1: Écrire le test de garde-fou qui échoue**

Créer `tests/ambient-player-bar-single-mount.test.ts` (même pattern que `tests/uploads-images-formdata-parse-guard.test.ts` : vérification statique du code source, pas d'exécution React) :

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("AmbientPlayerBar — montage unique sur la page d'accueil", () => {
  it("est rendu exactement une fois dans app/dashboard/page.tsx", async () => {
    const source = await fs.readFile("app/dashboard/page.tsx", "utf8");
    const occurrences = source.split("<AmbientPlayerBar").length - 1;
    expect(occurrences).toBe(1);
  });

  it("n'est jamais rendu à l'intérieur de UserDashboardMobile ou UserDashboardDesktop", async () => {
    const mobile = await fs.readFile("components/banani/UserDashboardMobile.tsx", "utf8");
    const desktop = await fs.readFile("components/banani/UserDashboardDesktop.tsx", "utf8");
    expect(mobile).not.toContain("AmbientPlayerBar");
    expect(desktop).not.toContain("AmbientPlayerBar");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run tests/ambient-player-bar-single-mount.test.ts`
Expected: FAIL (`app/dashboard/page.tsx` ne référence pas encore `AmbientPlayerBar`).

- [ ] **Step 3: Câbler le composant dans la page**

Lire d'abord `app/dashboard/page.tsx` existant, puis le modifier ainsi (ajout de deux imports, un appel `await`, et un rendu conditionnel en frère des deux divs existants — le reste du fichier ne change pas) :

```tsx
import { requireUser } from "@/lib/auth/session";
import UserDashboardMobile from "@/components/banani/UserDashboardMobile";
import UserDashboardDesktop from "@/components/banani/UserDashboardDesktop";
import AmbientPlayerBar from "@/components/banani/AmbientPlayerBar";
import Preview from "@/components/banani/Preview";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";
import { shouldShowAmbientBar } from "@/lib/demo/ambient-player-logic";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./banani.css";
export default async function Page() {
  await requireUser();
  const ambient = await getAmbientTrackStatus();
  return (
    <Preview>
      <div className="banani-mobile">
        <UserDashboardMobile />
      </div>
      <div className="banani-desktop">
        <UserDashboardDesktop />
      </div>
      {shouldShowAmbientBar(ambient) ? (
        <AmbientPlayerBar title={ambient.title} audioUrl={ambient.audioUrl as string} volumePercent={ambient.volumePercent} />
      ) : null}
    </Preview>
  );
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run tests/ambient-player-bar-single-mount.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx tests/ambient-player-bar-single-mount.test.ts
git commit -m "feat: jouer la musique d'ambiance sur l'accueil du tableau de bord"
```

---

## Task 9: i18n + vérification finale + test navigateur réel

**Files:**
- Modify: `lib/i18n/locales/en.json`, `lib/i18n/locales/es.json`, `lib/i18n/locales/pt.json` (générés par le script, pas de contenu à écrire à la main)

- [ ] **Step 1: Synchroniser les traductions**

Run: `npm run i18n:sync`

Vérifie que les nouvelles chaînes (« Musique d'ambiance », « Réactiver le son de la musique d'ambiance », « Couper le son de la musique d'ambiance ») ont été ajoutées aux 3 fichiers de locale par l'IA déjà connectée.

- [ ] **Step 2: Vérifier l'exhaustivité i18n**

Run: `npm run i18n:check`
Expected: PASS (aucune clé manquante).

- [ ] **Step 3: Lancer toute la suite de tests unitaires**

Run: `npm test`
Expected: PASS, y compris tous les nouveaux fichiers de test des Tasks 2, 6 et 8.

- [ ] **Step 4: Vérification manuelle au navigateur — cas nominal**

Avec `npm run dev` lancé et connecté avec le compte propriétaire ayant configuré une chanson dans `/admin/ambient-music` :
1. Ouvrir `/dashboard` : la bande doit apparaître en haut, l'audio doit démarrer (avec ou sans son selon la politique du navigateur — vérifier qu'il n'y a dans tous les cas qu'**une seule** source sonore, jamais un écho).
2. Cliquer le bouton muet/son : bascule immédiate, et un rechargement de la page respecte le dernier choix.
3. Naviguer vers `/dashboard/create` : le son doit s'arrêter immédiatement (vérifier à l'oreille et via `document.querySelectorAll('audio')` dans la console qu'aucun élément audio de la bande d'ambiance ne reste en lecture).
4. Revenir sur `/dashboard` : la musique doit reprendre.

- [ ] **Step 5: Vérification manuelle au navigateur — cas d'erreur**

Dans `/admin/ambient-music`, configurer temporairement (ou simuler via les DevTools réseau) une chanson dont l'URL audio répond en erreur : la bande doit se masquer proprement sur `/dashboard`, sans erreur JavaScript non gérée dans la console.

- [ ] **Step 6: Commit final si des fichiers de locale ont changé**

```bash
git add lib/i18n/locales/en.json lib/i18n/locales/es.json lib/i18n/locales/pt.json
git commit -m "chore: synchroniser les traductions de la musique d'ambiance"
```
