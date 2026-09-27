import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSongBySlug } from "@/lib/ai/songs";
import { resolveLocaleFromAcceptLanguage } from "@/lib/i18n/request-locale";
import { translateForLocale, translateTemplateForLocale } from "@/lib/i18n/translate";
import PublicSongPlayer from "./PublicSongPlayer";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  const t = (text: string) => translateForLocale(text, locale);
  const translateTemplate = (text: string, values: Record<string, string | number>) =>
    translateTemplateForLocale(text, values, locale);

  const song = await getPublicSongBySlug(slug);
  if (!song) return buildMetadata({ title: t("Chanson indisponible"), path: `/s/${slug}`, noIndex: true });
  return buildMetadata({
    title: translateTemplate("{title} — écoute sur MusikPro", { title: song.title }),
    description: song.occasion
      ? translateTemplate("Une chanson créée pour {occasion} avec MusikPro.", { occasion: song.occasion })
      : t("Une chanson créée avec MusikPro."),
    path: `/s/${slug}`,
    image: song.coverUrl ?? undefined,
  });
}

export default async function PublicSongPage({ params }: Params) {
  const { slug } = await params;
  const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));
  const t = (text: string) => translateForLocale(text, locale);

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
        {t("Créé avec")}{" "}
        <Link href="/" className="font-semibold text-foreground underline">
          MusikPro
        </Link>
      </p>
    </main>
  );
}
