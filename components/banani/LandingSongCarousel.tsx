"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CardAudioPlayer from "./CardAudioPlayer";
import Icon from "./Icon";
import type { LandingFeaturedSong } from "@/lib/landing-features/server";

/**
 * "Ils ont créé avec MusikPro": the featured songs in one horizontal, swipeable row (2 full cards on mobile, 3 on wide
 * screens, plus a partly visible next card so it is obvious there is more to swipe), snapping card by card, with a slim navigation line underneath — and a segmented line (one segment per card, no numbers) whose lit segments follow the cards in view. "Écouter" turns the tapped card itself into the shared
 * internal player (CardAudioPlayer, the same one as the dashboard "Tendances" cards) with its animated
 * visualizer. Labels arrive already translated from the server page.
 */
export default function LandingSongCarousel({
  songs,
  labels,
}: {
  songs: LandingFeaturedSong[];
  labels: { listen: string; navigation: string };
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // Index range of the cards currently in view — drives the segmented indicator under the row.
  const [view, setView] = useState({ first: 0, count: 1, scrollable: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = card.offsetWidth + gap;
    const total = track.children.length;
    const count = Math.max(1, Math.min(total, Math.round((track.clientWidth + gap) / step)));
    const max = track.scrollWidth - track.clientWidth;
    const atEnd = max > 4 && track.scrollLeft >= max - 4;
    const first = atEnd ? total - count : Math.min(total - count, Math.round(track.scrollLeft / step));
    setView((prev) =>
      prev.first === first && prev.count === count && prev.scrollable === max > 4
        ? prev
        : { first, count, scrollable: max > 4 },
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure, songs.length]);

  const scrollToCard = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - (track.firstElementChild as HTMLElement).offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="landing-carousel" data-peek-narrow={songs.length > 2} data-peek-wide={songs.length > 3}>
      <div ref={trackRef} className="landing-carousel-track" onScroll={measure} role="list">
        {songs.map((song) => (
          <div key={song.slug} role="listitem" className="landing-carousel-card">
            {song.audioUrl ? (
              // The card itself starts the in-card player: no navigation to the public /s/[slug] page.
              <div
                role="button"
                tabIndex={0}
                className="landing-card-hover landing-carousel-link"
                aria-label={`${labels.listen} — ${song.title}`}
                onClick={() => setActiveSlug(song.slug)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveSlug(song.slug);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={song.coverUrl ?? undefined} alt="" className="landing-carousel-cover" draggable={false} />
                <div className="landing-carousel-shade">
                  <p className="landing-carousel-title">{song.title}</p>
                  {song.style || song.occasion ? (
                    <p className="landing-carousel-meta">{[song.style, song.occasion].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <Link
                href={`/s/${song.slug}`}
                className="landing-card-hover landing-carousel-link"
                aria-label={song.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={song.coverUrl ?? undefined} alt="" className="landing-carousel-cover" draggable={false} />
                <div className="landing-carousel-shade">
                  <p className="landing-carousel-title">{song.title}</p>
                  {song.style || song.occasion ? (
                    <p className="landing-carousel-meta">{[song.style, song.occasion].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </div>
              </Link>
            )}
            {song.audioUrl && activeSlug !== song.slug ? (
              <button
                type="button"
                className="cta-glow landing-inline-play is-compact landing-carousel-listen"
                onClick={() => setActiveSlug(song.slug)}
                aria-label={`${labels.listen} — ${song.title}`}
              >
                <Icon i="play" size={14} />
                <span className="landing-inline-play-label">{labels.listen}</span>
              </button>
            ) : null}
            {song.audioUrl && activeSlug === song.slug ? (
              <CardAudioPlayer
                title={song.title}
                audioUrl={song.audioUrl}
                onClose={() => setActiveSlug(null)}
                compact
              />
            ) : null}
          </div>
        ))}
      </div>
      {view.scrollable ? (
        <div className="landing-carousel-dots" role="group" aria-label={labels.navigation}>
          {songs.map((song, index) => {
            const inView = index >= view.first && index < view.first + view.count;
            return (
              <button
                key={song.slug}
                type="button"
                className={inView ? "is-active" : undefined}
                onClick={() => scrollToCard(index)}
                aria-label={song.title}
                aria-current={inView ? "true" : undefined}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
