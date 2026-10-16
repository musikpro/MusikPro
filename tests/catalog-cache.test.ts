import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Faux Data Cache : mémoïse par clé, retient les tags et se vide avec revalidateTag (comme Next). */
const cache = vi.hoisted(() => {
  const entries = new Map<string, { value: unknown; tags: string[] }>();
  return { entries };
});

vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => Promise<unknown>, keys: string[], options: { tags?: string[] }) => async () => {
    const key = keys.join("|");
    const hit = cache.entries.get(key);
    if (hit) return hit.value;
    const value = await loader(); // une erreur lève ici : rien n'est mémorisé
    cache.entries.set(key, { value, tags: options.tags ?? [] });
    return value;
  },
  revalidateTag: (tag: string) => {
    for (const [key, entry] of cache.entries) if (entry.tags.includes(tag)) cache.entries.delete(key);
  },
}));

type Rows = Record<string, unknown>[];
const db = vi.hoisted(() => ({ rows: [] as Rows, calls: 0, fail: false }));

vi.mock("@/db", () => {
  const query = async () => {
    db.calls += 1;
    if (db.fail) throw new Error("base indisponible");
    return db.rows;
  };
  // db.select().from(t).where(c).orderBy(a, b) — le dernier maillon fait la requête.
  const chain = { from: () => chain, where: () => chain, orderBy: query };
  return { db: { select: () => chain } };
});

import { invalidateCatalogs } from "@/lib/catalog-cache/invalidate";
import { DEFAULT_LANGUAGES } from "@/lib/languages/catalog";
import { getActiveLanguageCatalog } from "@/lib/languages/server";
import { DEFAULT_MUSIC_STYLES } from "@/lib/music-styles/catalog";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { DEFAULT_OCCASIONS } from "@/lib/occasions/catalog";
import { getActiveOccasions } from "@/lib/occasions/server";

const styleRow = (name: string) => ({
  id: `id-${name}`,
  name,
  slug: name.toLowerCase(),
  description: `Style ${name}`,
  icon: "music-2",
  tone: "orange",
  translations: null,
});

const occasionRow = (name: string) => ({
  id: `id-${name}`,
  name,
  slug: name.toLowerCase(),
  description: null,
  emoji: "🎂",
  translations: null,
  showRecipient: true,
  showSender: true,
  titleFieldId: null,
  storyTitle: null,
  storySubtitle: null,
  storyLabel: null,
  storyPlaceholder: null,
  storyTip: null,
});

const languageRow = (code: string) => ({
  id: `id-${code}`,
  code,
  name: code,
  nativeName: code,
  flag: "🏳️",
});

beforeEach(() => {
  cache.entries.clear();
  db.rows = [];
  db.calls = 0;
  db.fail = false;
});

describe("cache des styles musicaux", () => {
  it("ne lit la base qu'une fois puis sert le cache", async () => {
    db.rows = [styleRow("Afrobeat")];
    const first = await getActiveMusicStyles();
    const second = await getActiveMusicStyles();
    expect(db.calls).toBe(1);
    expect(second).toEqual(first);
    expect(first[0]?.name).toBe("Afrobeat");
  });

  it("relit la base après l'invalidation du tag, avec les données à jour", async () => {
    db.rows = [styleRow("Afrobeat")];
    await getActiveMusicStyles();
    db.rows = [styleRow("Afrobeat"), styleRow("Coupé-décalé")];
    expect(await getActiveMusicStyles()).toHaveLength(1); // encore le cache
    invalidateCatalogs("musicStyles");
    expect(await getActiveMusicStyles()).toHaveLength(2);
    expect(db.calls).toBe(2);
  });

  it("renvoie les styles par défaut sur panne de base, sans mettre l'échec en cache", async () => {
    db.fail = true;
    expect(await getActiveMusicStyles()).toEqual(DEFAULT_MUSIC_STYLES);
    db.fail = false;
    db.rows = [styleRow("Zouglou")];
    const recovered = await getActiveMusicStyles();
    expect(recovered[0]?.name).toBe("Zouglou");
  });

  it("contourne le cache et la base en mode démo", async () => {
    expect(await getActiveMusicStyles({ demo: true })).toEqual(DEFAULT_MUSIC_STYLES);
    expect(db.calls).toBe(0);
    expect(cache.entries.size).toBe(0);
  });
});

describe("cache des occasions", () => {
  it("ne lit la base qu'une fois puis relit après invalidation", async () => {
    db.rows = [occasionRow("Anniversaire")];
    await getActiveOccasions();
    await getActiveOccasions();
    expect(db.calls).toBe(1);
    db.rows = [occasionRow("Anniversaire"), occasionRow("Mariage")];
    invalidateCatalogs("occasions");
    expect(await getActiveOccasions()).toHaveLength(2);
    expect(db.calls).toBe(2);
  });

  it("garde le comportement d'erreur : lève hors démo, valeurs par défaut en démo, sans cache", async () => {
    db.fail = true;
    await expect(getActiveOccasions()).rejects.toThrow("base indisponible");
    expect(await getActiveOccasions({ demo: true })).toEqual(DEFAULT_OCCASIONS);
    expect(cache.entries.size).toBe(0);
    db.fail = false;
    db.rows = [occasionRow("Naissance")];
    expect((await getActiveOccasions())[0]?.name).toBe("Naissance");
  });
});

describe("cache des langues", () => {
  it("met le catalogue en cache (deux requêtes la première fois, aucune ensuite)", async () => {
    db.rows = [languageRow("fr")];
    const first = await getActiveLanguageCatalog();
    expect(db.calls).toBe(2);
    await getActiveLanguageCatalog();
    expect(db.calls).toBe(2);
    expect(first.interfaceLanguages[0]?.code).toBe("fr");
    invalidateCatalogs("languages");
    await getActiveLanguageCatalog();
    expect(db.calls).toBe(4);
  });

  it("garde le comportement d'erreur : lève hors démo, défauts en démo", async () => {
    db.fail = true;
    await expect(getActiveLanguageCatalog()).rejects.toThrow("base indisponible");
    const demo = await getActiveLanguageCatalog({ demo: true });
    expect(demo.interfaceLanguages).toHaveLength(DEFAULT_LANGUAGES.length);
    expect(cache.entries.size).toBe(0);
  });
});

describe("isolation des catalogues", () => {
  it("invalider un catalogue n'efface pas les autres", async () => {
    db.rows = [styleRow("Afrobeat")];
    await getActiveMusicStyles();
    db.rows = [occasionRow("Mariage")];
    await getActiveOccasions();
    const before = db.calls;
    invalidateCatalogs("occasions");
    await getActiveMusicStyles(); // toujours en cache
    expect(db.calls).toBe(before);
    await getActiveOccasions(); // relu
    expect(db.calls).toBe(before + 1);
  });

  it("accepte plusieurs catalogues d'un coup", async () => {
    db.rows = [styleRow("Afrobeat")];
    await getActiveMusicStyles();
    db.rows = [occasionRow("Mariage")];
    await getActiveOccasions();
    invalidateCatalogs("musicStyles", "occasions");
    expect(cache.entries.size).toBe(0);
  });
});
