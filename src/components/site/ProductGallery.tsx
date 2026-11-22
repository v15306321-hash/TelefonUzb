"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogImage } from "@/lib/catalog";

type Labels = { photos: string; prev: string; next: string; open: string; close: string };

/**
 * Product photo gallery: swipeable (scroll-snap) main view, arrows on desktop,
 * thumbnails and a full-screen viewer. Shows the photos of the selected colour.
 */
export default function ProductGallery({ images, alt, labels }: { images: CatalogImage[]; alt: string; labels: Labels }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const key = images.map((i) => i.url).join("|");

  // colour changed → back to the first photo
  useEffect(() => {
    setIndex(0);
    track.current?.scrollTo({ left: 0 });
  }, [key]);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = track.current;
      if (!el || !images.length) return;
      const next = (i + images.length) % images.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
      setIndex(next);
    },
    [images.length],
  );

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== index) setIndex(i);
  };

  if (!images.length) {
    return <div className="aspect-[4/5] w-full rounded-[32px] bg-white" aria-hidden />;
  }

  const multiple = images.length > 1;

  return (
    <div>
      <div className="group relative overflow-hidden rounded-[32px] bg-white ring-1 ring-white/[0.06]">
        <div
          ref={track}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") goTo(index + 1);
            if (e.key === "ArrowLeft") goTo(index - 1);
          }}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={labels.photos}
          className="no-scrollbar flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none lg:max-h-[calc(100svh-9.5rem)]"
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => {
                setIndex(i);
                setLightbox(true);
              }}
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`${labels.open} ${i + 1} / ${images.length}`}
            >
              <Image
                src={img.url}
                alt={`${alt} — ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>

        {multiple && (
          <>
            <ArrowButton dir="prev" label={labels.prev} onClick={() => goTo(index - 1)} />
            <ArrowButton dir="next" label={labels.next} onClick={() => goTo(index + 1)} />
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
              {images.map((img, i) => (
                <span key={img.url} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-black/70" : "w-1.5 bg-black/20"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {multiple && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label={labels.photos}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => goTo(i)}
              className={`relative h-[76px] w-[61px] shrink-0 overflow-hidden rounded-2xl bg-white ring-2 transition ${
                i === index ? "ring-white" : "ring-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`${labels.photos} ${i + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain" />
            </button>
          ))}
        </div>
      )}

      {lightbox && <Lightbox images={images} start={index} alt={alt} labels={labels} onClose={(i) => (setLightbox(false), goTo(i, false))} />}
    </div>
  );
}

function ArrowButton({ dir, label, onClick }: { dir: "prev" | "next"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition hover:bg-black/75 group-hover:opacity-100 focus-visible:opacity-100 sm:grid ${
        dir === "prev" ? "left-4" : "right-4"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
      </svg>
    </button>
  );
}

/** Full-screen viewer (native <dialog>: focus trap and Esc out of the box). */
function Lightbox({ images, start, alt, labels, onClose }: { images: CatalogImage[]; start: number; alt: string; labels: Labels; onClose: (index: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    requestAnimationFrame(() => track.current?.scrollTo({ left: start * (track.current?.clientWidth ?? 0) }));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [start]);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + images.length) % images.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  return (
    <dialog
      ref={ref}
      onClose={() => onClose(index)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") goTo(index + 1);
        if (e.key === "ArrowLeft") goTo(index - 1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 backdrop:bg-black"
      aria-label={labels.photos}
    >
      <div
        ref={track}
        onScroll={() => {
          const el = track.current;
          if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
      >
        {images.map((img, i) => (
          <div key={img.url} className="relative h-full w-full shrink-0 snap-center">
            <Image src={img.url} alt={`${alt} — ${i + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label={labels.close}
        className="fixed right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => goTo(index - 1)} aria-label={labels.prev} className="fixed left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:grid">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" onClick={() => goTo(index + 1)} aria-label={labels.next} className="fixed right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:grid">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <p className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs tabular-nums text-white">
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </dialog>
  );
}
