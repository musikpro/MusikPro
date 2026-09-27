# Rangée d'actions carte chanson — Partager / Publier / Télécharger / Poster

> **Pour les workers agentiques :** REQUIRED SUB-SKILL : utiliser superpowers:writing-plans pour transformer cette spec en plan d'implémentation tâche par tâche.

## Contexte

L'utilisateur a fourni une capture d'écran (trois boutons pilule sous une chanson : « Partager » orange, « Publier » bleu marine, une icône téléchargement grise) et a demandé, par dictée vocale, d'ajouter sous chaque chanson créée une rangée de boutons **Partager / Publier / Télécharger**, tous avec **texte visible** (contrairement à la capture où le bouton téléchargement n'a qu'une icône), plus un bouton **Poster** pour associer une image de couverture à la chanson.

Exploration du code existant (voir échanges précédents) :

- L'écran concerné est `components/banani/MySongsGeneratedScreen.tsx` (« Mes chansons générées »), qui affiche déjà par version un mini bouton Partager (`share-2`) et Télécharger (`download`), reliés à `lib/demo/audio-actions.ts` (`shareAudioFile`/`downloadAudioFile` — Web Share API / fetch+blob). Ces boutons par version restent inchangés.
- Aucune notion de « chanson publique » n'existe : ni colonne de visibilité, ni route publique, ni page sans authentification. Confirmé : toutes les routes sous `app/api/songs/**` et `app/api/music/**` exigent une session.
- Une infrastructure d'upload d'image existe déjà (`app/api/uploads/images/route.ts` + `lib/storage/cloudinary.ts`, Cloudinary configuré dans `.env.local`) mais n'est consommée par **aucun** composant — c'est un gisement prêt à l'emploi pour le bouton Poster.
- `coverUrl` existe déjà en base (`musicGenerationJobs.coverUrl`, rempli automatiquement par le provider IA) mais **n'est jamais exposé côté client réel** : ni `SongGroupView` (lib/ai/songs.ts), ni `SongGroupResponse`/`WorkspaceSong` (DemoProvider/song-types) ne le portent aujourd'hui. Il faut le brancher de bout en bout pour que le poster s'affiche.
- Décisions validées avec l'utilisateur en chat :
  - « Publier » doit réellement rendre la chanson accessible via une URL, lisible par n'importe qui sans compte, sans possibilité de téléchargement pour ce visiteur.
  - Pas de bouton « dépublier » dans cette itération (accepté explicitement).
  - Périmètre limité à l'écran « Mes chansons générées » (pas le lecteur plein écran `SongPlayerScreen.tsx`, pas `SongCard.tsx`) — extensible plus tard sans changement d'architecture puisque toute la logique est portée par des fonctions réutilisables.

## Objectif de cette itération

Ajouter, sous chaque carte de chanson de `MySongsGeneratedScreen`, une rangée de 4 boutons agissant sur la **version principale** de la chanson (convention déjà utilisée ailleurs : `versions[0]`, trié par `versionLabel`) :

1. **Partager** — réutilise le partage existant (aucune nouvelle route).
2. **Publier** — nouvelle fonctionnalité complète : lien public `/s/<code>`, page de lecture sans authentification, sans bouton de téléchargement.
3. **Télécharger** — réutilise le téléchargement existant, avec libellé visible (au lieu d'une icône seule).
4. **Poster** — upload d'image (Cloudinary, déjà provisionné) qui devient la pochette affichée de la chanson, y compris sur la future page publique.

## Modèle de données

Nouvelle table Drizzle, additive, dans `db/schema/index.ts` (à la suite de `musicGenerationJobs`) :

```ts
export const songPublications = pgTable("song_publications", {
  songGroupId: text("song_group_id").primaryKey(),
  userId: text("user_id").notNull(),
  slug: text("slug").notNull().unique(),
  jobId: text("job_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- `songGroupId` en clé primaire : une chanson n'a qu'un seul lien public actif à la fois (republier renvoie toujours le même lien — idempotent).
- `slug` : code aléatoire non-devinable, généré côté appli avec `randomBytes(6).toString("base64url")` (48 bits d'entropie, ~8 caractères URL-safe), unicité imposée par la contrainte `unique()` avec re-tirage en cas de collision (improbable mais géré).
- `jobId` : la version publiée (aujourd'hui toujours `versions[0]` au moment de la publication — voir « Hors périmètre »).
- L'existence de la ligne = chanson publiée. Pas de colonne `isPublic` séparée : plus simple, rien à désynchroniser.
- Migration générée avec `npm run db:generate` (pas de connexion DB nécessaire, drizzle-kit introspecte le schéma TS) ; `npm run db:migrate` sera exécuté dans cet environnement de développement puisque `DATABASE_URL` y est déjà configuré.

**`SongGroupView` (lib/ai/songs.ts)** : ajout d'un champ `coverUrl: string | null`, dérivé de `first.coverUrl` dans `toGroupView()` (même convention que `title`/`style`/`occasion`, déjà dérivés du premier job trié).

## Fonctions serveur (`lib/ai/songs.ts`)

Import à ajouter en tête de fichier : `randomBytes` depuis `node:crypto` (à côté de `randomUUID`, déjà importé) et `songPublications` depuis `@/db/schema` (à côté de `musicGenerationJobs`).

```ts
export class SongNotReadyError extends Error {}

export async function setSongGroupCover(userId: string, songGroupId: string, coverUrl: string): Promise<void> {
  const database = getServiceDb();
  const result = await database
    .update(musicGenerationJobs)
    .set({ coverUrl, updatedAt: new Date() })
    .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)))
    .returning({ id: musicGenerationJobs.id });
  if (!result.length) throw new MusicJobOwnershipError();
}

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
      if (attempt === 2) throw error; // exhausted retries on slug collision
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

Ownership vérifiée par `userId` à chaque étape, comme le reste du fichier. `getPublicSongBySlug` ne renvoie jamais `userId`, `prompt`, `lyrics` ni aucun identifiant interne — seulement ce qui doit apparaître sur la page publique.

## Nouvelles routes API

### `POST /api/songs/[groupId]/publish/route.ts`

Même squelette de sécurité que `app/api/songs/[groupId]/route.ts` (`rejectCrossSiteMutation`, session requise, `rateLimit` — ex. `songs:publish:${userId}:${ip}`, 20/min, zod `groupIdSchema`) :

- Appelle `publishSongGroup(session.user.id, groupId)`.
- `MusicJobOwnershipError` → 404 « Chanson introuvable. » ; `SongNotReadyError` → 409 « Cette chanson n'est pas encore prête à être publiée. ».
- `writeAuditLog({ action: "musicful.song.published", actorId: session.user.id, targetType: "song_group", targetId: groupId })` (même pattern que `musicful.song.removed`).
- Réponse : `{ url: new URL(`/s/${slug}`, request.url).toString() }`.

### `PATCH /api/songs/[groupId]/cover/route.ts`

Même squelette de sécurité, corps validé par zod :

```ts
const coverSchema = z.object({ coverUrl: z.string().url() });
```

**Contrôle de sécurité additionnel, justifié par la nouvelle exposition publique** : la pochette devient visible sur une page publique sans authentification (`/s/[slug]`) et dans les aperçus de réseaux sociaux (Open Graph). Pour empêcher qu'un client altéré fasse pointer `coverUrl` vers une image arbitraire hébergée ailleurs (risque de contenu trompeur ou de traqueur d'URL affiché à des tiers), la route vérifie que l'hôte de l'URL correspond au domaine Cloudinary attendu (`res.cloudinary.com`, ou le `CLOUDINARY_CLOUD_NAME` configuré) avant d'accepter la mise à jour — rejet 400 sinon. Appelle `setSongGroupCover`, renvoie `{ coverUrl }`.

## Page publique — `app/s/[slug]/page.tsx`

Route hors `/dashboard` et `/admin` (le middleware `proxy.ts` ne protège que ces deux préfixes — confirmé, rien à changer côté proxy), donc accessible sans session par construction.

- Server Component : appelle directement `getPublicSongBySlug(slug)` (pas d'aller-retour HTTP interne). Si `null` → `notFound()` (Next.js), avec un `app/s/[slug]/not-found.tsx` dédié : page française, sobre, brandée « Chanson indisponible » + lien vers l'accueil MusikPro (jamais une 404 Next brute, et le même rendu que le slug n'ait jamais existé ou ait été retiré — pas de signal d'énumération).
- `generateMetadata` via `buildMetadata({ title: \`${song.title} — écoute sur MusikPro\`, description: ..., path: \`/s/${slug}\`, image: song.coverUrl ?? undefined })` (`lib/seo/metadata.ts`, déjà utilisé ailleurs) : donne un bel aperçu Open Graph/Twitter quand le lien est collé sur WhatsApp/Instagram/etc. — exactement l'usage « publier sur les réseaux sociaux » demandé.
- Contenu : pochette (grande), titre, badges style/occasion, lecteur audio.
- Lecteur : composant client `PublicSongPlayer` avec un simple `<audio controls src={audioUrl} controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} />`. **Limite assumée et documentée** : `controlsList="nodownload"` masque l'option de téléchargement native de Chrome/Edge, mais un visiteur techniquement motivé peut toujours récupérer le fichier via les outils réseau du navigateur — comme pour tout flux audio non chiffré/DRM. Cela satisfait l'intention (« lecture sans bouton télécharger accessible »), pas une protection cryptographique, qui serait hors de portée raisonnable ici.
- Pas de lecture des paroles, pas de compteur d'écoutes, pas de bouton retour vers l'app autre qu'un pied de page discret « Créé avec MusikPro » (lien vers l'accueil, levier de croissance standard, non intrusif).

## Câblage client

**`lib/demo/song-types.ts`** : `WorkspaceSong` gagne `coverUrl?: string | null`.

**`components/banani/DemoProvider.tsx`** :
- `SongGroupResponse` : ajoute `coverUrl: string | null`.
- `mapSongGroup` : mappe `coverUrl: song.coverUrl`.
- Deux nouvelles actions exposées par le contexte, sur le modèle de `removeSong` (appel réseau, puis `refreshSongs()`, notify en français en cas d'échec) :
  - `publishSong(id): Promise<string | null>` — mode démo : `notify("Action de démonstration : aucune opération réelle effectuée.")`, retourne `null`. Mode réel : `POST /api/songs/${id}/publish` via `apiFetch`, retourne `result.url` ou `null` + notify sur échec (message français dérivé de `ApiClientError`, avec repli générique si le message serveur n'est pas exploitable).
  - `setSongCover(id, coverUrl): Promise<boolean>` — même schéma, `PATCH /api/songs/${id}/cover`, `refreshSongs()` puis `notify("Pochette mise à jour.")` en cas de succès.

**`lib/demo/audio-actions.ts`** : petit refactor interne, sans changement de comportement, pour réutiliser la logique de partage avec un texte différent :

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

**Nouveau `lib/demo/cover-actions.ts`** :

```ts
export async function uploadCoverImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const result = await apiFetch<{ url: string }>("/api/uploads/images", { method: "POST", body: form });
  return result.url;
}
```

**`app/api/uploads/images/route.ts`** : les 4 messages d'erreur JSON sont actuellement en anglais (`"Unauthorized"`, `"Too many upload requests"`, `"Cloudinary is not enabled"`, `"Image file is required"`, `"Image upload failed"`) alors que cette route n'avait encore jamais de consommateur réel. Puisque le bouton Poster en fait le premier appelant réel côté utilisateur final, ces messages sont traduits en français dans le cadre de ce chantier (correction ciblée, aucun changement de comportement/contrat — mêmes codes HTTP, mêmes clés JSON).

## `components/banani/MySongsGeneratedScreen.tsx`

Nouvelle rangée de 4 boutons pilule, sous la liste des versions et au-dessus de la rangée existante (Modifier paroles / Régénérer / Supprimer, inchangée) :

- **Partager** (orange, `share-2`) → réutilise `shareVersion(song.title, primary.label, primary.audioUrl)`, déjà défini dans ce fichier.
- **Publier** (bleu marine, `globe`) → nouveau handler : appelle `demo.publishSong(song.id)`, puis si une URL est retournée, `shareLink(url, song.title, "Écoute ma chanson créée sur MusikPro !")`, puis `demo.notify(...)` adapté au résultat (`"copied"` → lien copié, `"shared"` → confirmation, sinon message neutre indiquant que le lien est bien créé).
- **Télécharger** (icône + texte, contrairement à la capture) → réutilise `downloadVersion(...)`.
- **Poster** (`image`/`upload`) → `<input type="file" accept="image/*" hidden>` déclenché par le bouton ; en mode démo, même garde que les autres actions (`notify` placeholder, aucun appel réseau) ; en mode réel, au changement de fichier : `uploadCoverImage(file)` puis `demo.setSongCover(song.id, url)`.

Toutes désactivées avec le même style `opacity-50` que les boutons existants tant que `primary` n'a pas de `audioUrl`/`status === "completed"` (mode réel uniquement — en démo tout reste cliquable avec le message placeholder habituel). Toutes avec `data-demo-ready="true"` et libellés passés par `t(...)`.

Petite pochette carrée (48×48, `rounded-lg`, objet `song.coverUrl`) ajoutée dans l'en-tête de carte quand elle existe, pour que le bouton Poster ait un effet visible immédiatement.

## i18n

Nouvelles chaînes fixes à envelopper avec `t(...)` puis synchroniser via `npm run i18n:sync` : « Partager », « Publier », « Télécharger », « Poster », « Pochette mise à jour. », « Lien public copié dans le presse-papiers. », « Chanson publiée et partagée ! », « Cette chanson n'est pas encore prête à être publiée. », « Impossible de publier cette chanson pour le moment. », « Impossible de mettre à jour la pochette pour le moment. », le contenu de `app/s/[slug]/not-found.tsx`, et le pied de page « Créé avec MusikPro » de la page publique. `npm run i18n:check` (déjà dans `ci:check`) validera l'exhaustivité.

## Sécurité — récapitulatif

- Ownership vérifiée (`userId`) sur `publish` et `cover`, comme toutes les routes `songs/[groupId]` existantes.
- `slug` : 48 bits d'entropie aléatoire, non séquentiel, contrainte d'unicité en base.
- Rate limiting sur les deux nouvelles routes mutantes, dans la continuité des routes voisines.
- `getPublicSongBySlug` ne fuit jamais `userId`/`prompt`/`lyrics`/id interne.
- Page publique : même rendu « indisponible » qu'un slug ait été retiré ou n'ait jamais existé (pas de signal d'énumération).
- `coverUrl` restreint au domaine Cloudinary attendu avant d'être accepté (protection ajoutée parce que ce champ devient visible publiquement, pas seulement dans l'app authentifiée).
- Migration additive, aucune colonne ni route existante modifiée en profondeur (seul le libellé d'erreur de l'upload change, sans changement de contrat).

## Hors périmètre (assumé explicitement, validé avec l'utilisateur)

- Pas de bouton « dépublier » — facile à ajouter plus tard (`DELETE` sur la même route `publish`, qui supprimerait la ligne `songPublications`).
- Pas de sélection manuelle de la version publiée — toujours `versions[0]` au moment de la publication.
- Pas de compteur d'écoutes ni d'affichage des paroles sur la page publique.
- Boutons ajoutés uniquement sur `MySongsGeneratedScreen` — pas sur `SongPlayerScreen.tsx` ni `SongCard.tsx` (toute la logique serveur/contexte étant déjà réutilisable, une extension ultérieure à ces écrans serait un chantier UI seul, sans nouvelle route).

## Vérification prévue

- `npm run kit:integrity`, `npm run kit:audit`, `npm run i18n:check` (ou `ci:check` s'il les inclut tous), `/security-saas`.
- Tests unitaires : étendre les tests existants de `lib/ai/songs.ts` s'ils existent, sinon ajouter un test ciblé pour `publishSongGroup`/`getPublicSongBySlug` (idempotence de la publication, refus si chanson non prête, non-fuite des champs privés).
- Navigateur : Cloudinary et `DATABASE_URL` sont déjà configurés dans cet environnement — vérification réelle prévue (pas seulement en mode démo) : lancer `npm run dev`, publier une vraie chanson depuis un compte de test, ouvrir le lien `/s/<slug>` dans un contexte sans cookies (page privée) pour confirmer l'accès sans compte et l'absence de bouton téléchargement, puis tester l'upload de poster de bout en bout.
