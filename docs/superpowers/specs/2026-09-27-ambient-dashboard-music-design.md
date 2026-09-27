# Musique d'ambiance sur le tableau de bord

> **Pour les workers agentiques :** REQUIRED SUB-SKILL : utiliser superpowers:writing-plans pour transformer cette spec en plan d'implémentation tâche par tâche.

## Contexte

Demande (dictée vocale + précisions en chat) : ajouter une musique de fond automatique sur la page d'accueil du tableau de bord, choisie par l'administrateur parmi ses propres chansons générées, à faible volume, qui s'arrête automatiquement dès que la personne quitte l'accueil (création de chanson, clic sur le micro pour dicter sa voix, etc.), avec une bande de contrôle visible (desktop et mobile) affichant une animation "en cours de lecture" et un moyen de couper le son.

Décisions validées en chat (questions à choix) :

- **Vivier de chansons** : uniquement les chansons du compte propriétaire/admin connecté (pas les créations d'autres utilisateurs, publiées ou non) — évite d'utiliser la création privée d'un client comme fond sonore public.
- **Portée de lecture** : uniquement la page d'accueil `/dashboard` au sens strict. Toute autre page (création, Mes chansons, Paroles, Favoris, Crédits, etc.) est silencieuse.
- **Autoplay avec son** : tentative de démarrage avec son dès le montage de la page ; si le navigateur bloque (politique d'autoplay, promesse `play()` rejetée), bascule silencieuse en muet — le bouton muet/son déjà prévu sert alors de rattrapage, sans bouton supplémentaire.
- **Contrôles visiteur** : lecture/pause + muet uniquement (pas de curseur de volume pour le visiteur — le niveau est fixé une fois par l'admin).
- **Volume** : réglé par l'admin, plafonné à 50 % côté validation (garde-fou structurel, pas seulement une convention documentée) pour rester un fond sonore discret.
- **Mode démo public** : la musique joue aussi sur la démo publique (visiteurs non connectés qui testent l'interface) — aucune règle de mode à écrire, les composants d'accueil sont déjà partagés entre démo et comptes réels.

Point d'architecture découvert en explorant le code : `app/dashboard/page.tsx` monte **simultanément** `UserDashboardMobile` et `UserDashboardDesktop` dans le DOM (le composant `Preview` bascule leur visibilité par CSS/media queries, pas par rendu conditionnel React — voir `.banani-mobile`/`.banani-desktop`). Si la lecture audio vivait dans l'un de ces deux composants et qu'on la dupliquait dans l'autre pour "couvrir mobile et desktop", on obtiendrait deux `<audio>` qui jouent en même temps. La bande de contrôle et son moteur audio doivent donc vivre dans **un seul composant**, monté une seule fois en frère de ces deux divs, qui affiche en interne un habillage visuel différent par breakpoint (même convention que le reste de l'app) mais ne possède qu'un seul élément `<audio>` et un seul état de lecture.

## Objectif de cette itération

1. Un réglage global (une chanson, un volume, activé/désactivé) que l'admin configure depuis une nouvelle page du tableau de bord propriétaire.
2. Une bande de lecture sur la page d'accueil du tableau de bord (démo et comptes réels), visible desktop et mobile, avec animation "en cours de lecture" et bouton muet/son.
3. Arrêt automatique et sans code dédié dès qu'on quitte l'accueil (démontage React du composant), ce qui couvre aussi bien la navigation vers la création que le clic sur le micro de dictée vocale (qui n'existe que dans les pages de création).

## Modèle de données

Nouvelle table Drizzle, additive, dans `db/schema/index.ts` (même convention singleton que `paymentBypassSettings`, à sa suite) :

```ts
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

- Ligne unique `id="global"`, upsert via `onConflictDoUpdate` (identique au mode test de `app/admin/settings/actions.ts`).
- `title`/`audioUrl` mis en cache au moment de la sélection : évite une jointure vers `music_generation_jobs` à chaque chargement du tableau de bord (page visitée par tous les utilisateurs, alors que la config change rarement). Si la chanson source est supprimée ensuite par l'admin, ces valeurs mises en cache restent affichables tant que le fichier Cloudinary existe encore ; `enabled` reste la seule source de vérité pour savoir si la bande doit s'afficher. Pas de `coverUrl` : la bande n'affiche que le titre et l'animation d'égaliseur, pas de vignette (hors périmètre, non demandé).
- `volumePercent` : entier 5–50, validé côté Zod à l'écriture (voir plus bas) — jamais 0 (ce serait "muet", déjà couvert par `enabled=false` ou par le bouton muet) ni au-delà de 50 (le fond sonore ne doit jamais dominer).
- Migration générée avec `npm run db:generate` (introspection du schéma TS, pas de connexion DB requise) puis appliquée avec `npm run db:migrate` dans cet environnement de développement (branche Neon `development` isolée, `DATABASE_URL` déjà configurée).

## Fonctions serveur

**`lib/settings/ambient-track.ts`** (nouveau, même convention que `lib/settings/payment-bypass.ts`) :

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";

export type AmbientTrackStatus = {
  enabled: boolean;
  title: string | null;
  audioUrl: string | null;
  volumePercent: number;
};

const DISABLED: AmbientTrackStatus = { enabled: false, title: null, audioUrl: null, volumePercent: 20 };

/** Réglage global : la chanson d'ambiance jouée sur l'accueil du tableau de bord (démo et comptes réels). */
export async function getAmbientTrackStatus(): Promise<AmbientTrackStatus> {
  const [row] = await db
    .select({
      enabled: ambientBackgroundTrack.enabled,
      title: ambientBackgroundTrack.title,
      audioUrl: ambientBackgroundTrack.audioUrl,
      volumePercent: ambientBackgroundTrack.volumePercent,
    })
    .from(ambientBackgroundTrack)
    .where(eq(ambientBackgroundTrack.id, "global"))
    .limit(1);
  if (!row || !row.enabled || !row.audioUrl) return DISABLED;
  return { enabled: true, title: row.title, audioUrl: row.audioUrl, volumePercent: row.volumePercent };
}
```

- `!row.audioUrl` traité comme désactivé : si l'admin active le réglage sans avoir choisi de chanson (ne devrait pas arriver via le formulaire, mais défensif), la bande ne s'affiche simplement pas plutôt que de planter sur une URL vide.
- Pas de `try/catch` avalant les erreurs ici (contrairement à `isPaymentBypassEnabled`) : cette fonction est lue au chargement de la page d'accueil du tableau de bord, une vraie erreur DB doit remonter comme pour n'importe quelle autre donnée de la page, pas être masquée en silence.

**`app/admin/ambient-music/actions.ts`** (nouveau) :

```ts
"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listSongGroupsForUser } from "@/lib/ai/songs";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const setTrackSchema = z.object({
  songGroupId: z.string().min(1, "Choisis une chanson."),
  volumePercent: z.coerce.number().int().min(5).max(50),
});

export async function setAmbientTrack(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setTrackSchema.parse({
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

export async function disableAmbientTrack(_previous: AdminActionState): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const db = getServiceDb();
    await db
      .insert(ambientBackgroundTrack)
      .values({ id: "global", enabled: false, updatedBy: session.user.id, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ambientBackgroundTrack.id,
        set: { enabled: false, updatedBy: session.user.id, updatedAt: new Date() },
      });
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

- `revalidatePath("/dashboard", "layout")` : même convention que `setPaymentBypass`, pour que le changement soit visible immédiatement pour tous les visiteurs de l'accueil, pas seulement après un redémarrage/cache expiré.
- `disableAmbientTrack` ne prend pas `formData` (pas de champ à lire) : signature à deux paramètres acceptée par `useActionState`/`AdminActionForm` tant que le second reste optionnel ; suit le même principe que les autres actions à bouton unique du dashboard.

## Page admin

**Nouvelle entrée de menu**, dans `components/admin/AdminShell.tsx`, groupe "Configuration" (à la suite de "Fournisseurs IA", ligne ~43) :

```ts
{ href: "/admin/ambient-music", icon: "music-4", label: "Musique d'ambiance" },
```

**`app/admin/ambient-music/page.tsx`** (nouveau, Server Component) :

- Appelle `requireAdmin()`, `getAmbientTrackStatus()`, et `listSongGroupsForUser(session.user.id)` filtré à `status === "completed" && versions[0]?.audioUrl` (chansons réellement écoutables).
- Rend un `<AmbientMusicPanel status={status} songOptions={songOptions} />` (Client Component, pattern `AdminActionForm` identique à `PaymentBypassPanel`) :
  - Liste déroulante des chansons éligibles (libellé `title — style`, valeur `songGroupId`), présélectionnée sur `status.songGroupId` si une piste est déjà configurée.
  - Curseur ou champ numérique `volumePercent`, borné 5–50 dans l'attribut HTML (`min`/`max`) en plus de la validation serveur — défense en profondeur, pas une garantie côté client. Valeur initiale : `status.volumePercent` si une piste existe déjà, sinon 20 (le défaut de la colonne).
  - Bouton principal "Enregistrer" (`setAmbientTrack`) et, si `status.enabled`, un second `<AdminActionForm action={disableAmbientTrack}>` avec bouton "Désactiver" (deux formulaires distincts dans le même `<section>`, pattern déjà utilisé pour Modifier + Supprimer dans `app/admin/payment-providers/chariow/page.tsx`).
  - Si `songOptions.length === 0` : message "Tu n'as encore aucune chanson terminée à utiliser comme fond sonore." à la place du formulaire, pas de select vide.

## Composant de lecture (accueil uniquement)

**`components/banani/AmbientPlayerBar.tsx`** (nouveau, Client Component), props :

```ts
type AmbientPlayerBarProps = {
  title: string | null;
  audioUrl: string;
  volumePercent: number;
};
```

- Monté une seule fois dans `app/dashboard/page.tsx`, en frère des deux divs `.banani-mobile`/`.banani-desktop` existants — pas dupliqué à l'intérieur de `UserDashboardMobile`/`UserDashboardDesktop` (voir point d'architecture en Contexte). Rendu conditionnel côté page : `status.enabled && status.audioUrl ? <AmbientPlayerBar .../> : null`.
- Un seul `<audio ref>` avec `loop` (le fond sonore ne doit jamais retomber dans le silence après ~4 minutes) et `src={audioUrl}`, volume initialisé à `volumePercent / 100`.
- Au montage : tentative `audio.play()` (son actif, `muted=false`). Si la promesse est rejetée (`NotAllowedError`, politique d'autoplay du navigateur), on passe `muted=true` et on relance `play()` — l'audio démarre alors silencieusement, et le bouton muet/son (déjà affiché) permet de l'activer d'un clic, sans UI supplémentaire ni état d'erreur visible.
- Préférence "muet" mémorisée en `localStorage` (`musikpro-ambient-muted`, `"1"`/absent) : si l'utilisateur a explicitement coupé le son, ce choix est respecté au prochain chargement de la page (pas de nouvelle tentative de son forcé), lu une seule fois à l'initialisation du composant.
- Démontage (`useEffect` cleanup) : `audio.pause()` — couvre la navigation vers n'importe quelle autre page du tableau de bord (React démonte `AmbientPlayerBar` en changeant de route), donc aussi bien "aller créer une chanson" que "cliquer sur le micro de dictée" (qui n'existe que sur les pages de création, déjà silencieuses à ce stade).
- Markup : un seul composant, deux blocs JSX conditionnés par les classes CSS déjà en place (`banani-mobile`/`banani-desktop` appliquées à des wrappers internes), pas deux composants séparés — un seul état React (`muted`, `animationPlaying`), un seul `<audio>`.
- Animation "en cours de lecture" : petites barres façon égaliseur (3-4 `<span>` avec une animation CSS `@keyframes` de hauteur, décalées en `animation-delay`), visibles seulement quand `!muted` et que la lecture est effectivement démarrée (`onPlaying`/`onPause` sur l'élément `<audio>` pilotent l'état, pas une supposition optimiste).
- Bouton muet/son : icône `volume-2`/`volume-x` (`Icon` déjà utilisé partout dans `components/banani/`), `aria-label` explicite ("Couper le son de la musique d'ambiance" / "Réactiver le son de la musique d'ambiance"), bascule `audio.muted` + écrit la préférence en `localStorage`.
- i18n : les deux libellés d'aria-label et un éventuel texte visible ("Musique d'ambiance") passent par `t()` comme le reste de l'app (règle CLAUDE.md obligatoire) ; le titre de la chanson elle-même n'est **pas** traduit (contenu généré par l'utilisateur, exemption explicite des règles i18n).

## Câblage dans `app/dashboard/page.tsx`

```ts
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
      {ambient.enabled && ambient.audioUrl ? (
        <AmbientPlayerBar title={ambient.title} audioUrl={ambient.audioUrl} volumePercent={ambient.volumePercent} />
      ) : null}
    </Preview>
  );
}
```

Aucun changement à `isDemoRequest()`/`requireUser()` : `getAmbientTrackStatus()` est un réglage global indépendant de la session, donc lu et rendu identiquement pour la démo publique et les comptes réels — satisfait la décision "aussi en démo" sans code conditionnel.

## Erreurs

- Chanson source supprimée après configuration (admin a supprimé la chanson dans "Mes chansons" après l'avoir choisie comme fond sonore) : `audioUrl` en cache reste valide tant que le fichier Cloudinary existe (suppression de chanson ne supprime pas le fichier Cloudinary, uniquement la ligne `music_generation_jobs` — comportement déjà existant, non modifié ici). Si le fichier disparaît réellement, l'élément `<audio>` déclenche `onError` : la bande se masque proprement (état local `loadError`), pas de son cassé ni de boucle d'erreurs.
- `play()` rejeté pour une raison autre que l'autoplay (ex. format non supporté) : même traitement que l'échec réseau — `onError` masque la bande.
- Formulaire admin soumis sans chanson sélectionnée ou avec un volume hors bornes : rejeté par le Zod `setTrackSchema`, message d'erreur explicite via le toast existant (`actionErrorMessage`).
- Chanson choisie ensuite désactivée par un `disableAmbientTrack` : `enabled=false` suffit, pas besoin d'effacer `audioUrl`/`title` (ré-activable en un clic si l'admin change d'avis, mais ce n'est pas exposé dans cette itération — `enabled=true` ne peut être remis qu'en resoumettant `setAmbientTrack`).

## Tests

- Migration Drizzle générée et vérifiée par `npm run db:generate` (pas de connexion requise) puis appliquée en développement par `npm run db:migrate`.
- Test unitaire Zod : `setTrackSchema` rejette `volumePercent` à 0, 4, 51 et 100 ; accepte 5, 20, 50.
- Test unitaire `computeAutoplayFallback`-style (fonction pure extraite de la logique play/catch/mute) : simule une promesse rejetée → attend `muted=true` en sortie.
- Test statique (pattern déjà utilisé pour `uploads-images-formdata-parse-guard.test.ts`) : `app/dashboard/page.tsx` rend `AmbientPlayerBar` en frère des deux divs `.banani-mobile`/`.banani-desktop`, jamais à l'intérieur de l'un des deux — garde-fou contre une régression qui recréerait le bug de double lecture audio identifié dans cette spec.
- Test composant `AmbientPlayerBar` : ne s'affiche pas si `audioUrl` vide ; bouton muet bascule `audio.muted` et persiste en `localStorage` ; `onError` masque la bande.

## Hors périmètre (explicitement exclu de cette itération)

- Curseur de volume pour le visiteur (refusé en chat : lecture/pause + muet uniquement).
- Plusieurs pistes d'ambiance ou rotation aléatoire — une seule piste globale à la fois.
- Musique différente par page du tableau de bord (Mes chansons, Favoris, etc.) — silence partout sauf l'accueil strict.
- Historique/audit visuel des changements de piste dans l'admin (l'`audit_logs` existant suffit, pas de nouvelle UI dédiée).
