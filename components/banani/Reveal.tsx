"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

/**
 * Fades/slides a section into view right away when it already sits in the first screen, otherwise the first time it crosses into the viewport (IntersectionObserver,
 * disconnects after firing once). Pure presentation — server-rendered children are passed straight
 * through, so this is the only client boundary the landing page needs for scroll animations.
 * `.reveal-up`/`.reveal-up-visible` (app/dashboard/banani.css) already collapse to a no-op under
 * prefers-reduced-motion.
 */
export default function Reveal({ children, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Anything already inside the first screen (nothing scrolled yet) animates in right away —
    // the observer's 15% threshold and bottom margin would otherwise leave it hidden until the
    // visitor scrolls. rAF keeps the fade/slide transition (it needs a painted "hidden" frame).
    if (el.getBoundingClientRect().top < window.innerHeight) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal-up ${visible ? "reveal-up-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
