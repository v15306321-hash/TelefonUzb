"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  mobileSrc: string;
  poster: string;
  mobilePoster: string;
  label: string;
};

/**
 * Full-bleed background video.
 *  - poster image renders immediately (LCP), the video is attached after hydration
 *    so it never blocks the first paint;
 *  - a lighter file is used on small / portrait screens;
 *  - playback pauses when the hero leaves the viewport or the tab is hidden;
 *  - on any error the poster stays as a graceful fallback.
 */
export default function HeroVideo({ src, mobileSrc, poster, mobilePoster, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (orientation: portrait) and (max-width: 1024px)");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return; // respect data saver: keep poster
    setSource(mq.matches ? mobileSrc : src);
  }, [src, mobileSrc]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !source) return;
    const tryPlay = () => v.play().catch(() => undefined);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tryPlay() : v.pause()), { threshold: 0.05 });
    io.observe(v);
    const onVis = () => (document.visibilityState === "visible" ? tryPlay() : v.pause());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [source]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
      {(poster || mobilePoster) && (
        <picture>
          {mobilePoster && <source media="(max-width: 767px)" srcSet={mobilePoster} />}
          <img
            src={poster || mobilePoster}
            alt=""
            fetchPriority="high"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-[58%_50%] transition-opacity duration-1000 ${playing && !failed ? "opacity-0" : "opacity-100"}`}
          />
        </picture>
      )}
      {source && !failed && (
        <video
          ref={ref}
          key={source}
          className={`absolute inset-0 h-full w-full object-cover object-[58%_50%] transition-opacity duration-1000 ${playing ? "opacity-100" : "opacity-0"}`}
          src={source}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-label={label}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
