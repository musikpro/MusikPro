import { primeOverlay } from "@/lib/i18n/overlay-server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getPublicSongBySlug } from "@/lib/ai/songs";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale, translateTemplateForLocale } from "@/lib/i18n/translate";
import Icon from "@/components/banani/Icon";
import PublicSongPlayer from "./PublicSongPlayer";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
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
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);

  const song = await getPublicSongBySlug(slug);
  if (!song) notFound();

  return (
    <main className="public-song-page">
      {song.coverUrl ? (
        <div className="psp-backdrop" style={{ backgroundImage: `url(${song.coverUrl})` }} />
      ) : (
        <div className="psp-backdrop-fallback" />
      )}
      <div className="psp-scrim" />
      <div className="psp-card">
        <div className="psp-cover-wrap">
          <div className="psp-cover-glow" />
          <div className="psp-cover">
            {song.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.coverUrl} alt={song.title} />
            ) : (
              <div className="psp-cover-placeholder">
                <Icon i="music-2" size={40} />
              </div>
            )}
          </div>
        </div>
        <h1 className="psp-title">{song.title}</h1>
        {song.style || song.occasion ? (
          <div className="psp-badges">
            {song.style ? <span className="psp-badge">{song.style}</span> : null}
            {song.occasion ? <span className="psp-badge psp-badge-muted">{song.occasion}</span> : null}
          </div>
        ) : null}
        <PublicSongPlayer
          audioUrl={song.audioUrl}
          title={song.title}
          playLabel={t("Écouter")}
          pauseLabel={t("Mettre en pause")}
          seekLabel={t("Progression de la lecture")}
        />
      </div>
      <div className="psp-cta">
        <p className="psp-cta-text">{t("Toi aussi, offre une chanson unique à tes proches.")}</p>
        <Link href="/register" className="psp-cta-button">
          <Icon i="music-2" size={17} />
          {t("Créer ma musique avec MusikPro")}
        </Link>
      </div>
      <p className="psp-footer">
        {t("Créé avec")}{" "}
        <Link href="/">MusikPro</Link>
      </p>
    </main>
  );
}
