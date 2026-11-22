"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { CatalogImage } from "@/lib/catalog";
import type { Model3DConfig } from "@/lib/types";
import ProductViewer from "@/components/viewer/ProductViewer";

type ColorView = { name: string; hex: string };

type Labels = {
  color: string;
  storage: string;
  dragHint: string;
  loading3d: string;
  fallback3d: string;
  view3d: string;
  photos: string;
};

export default function ProductShowcase({
  name,
  model3d,
  modelUrl,
  images,
  colors,
  storageOptions,
  labels,
  header,
  actions,
  children,
}: {
  name: string;
  model3d: Model3DConfig;
  modelUrl: string | null;
  images: CatalogImage[];
  colors: ColorView[];
  storageOptions: string[];
  labels: Labels;
  header: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  const [colorIdx, setColorIdx] = useState(0);
  const [storage, setStorage] = useState(storageOptions[0] ?? "");
  const [view, setView] = useState<number>(-1); // -1 = 3D, otherwise photo index
  const color = colors[colorIdx]?.hex ?? "#2b2b2e";
  const photo = view >= 0 ? images[view] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.12fr_1fr] lg:gap-14">
      {/* -------- visual column -------- */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative h-[58svh] min-h-[380px] overflow-hidden rounded-[32px] bg-gradient-to-b from-graphite-900 to-black ring-1 ring-white/[0.06] sm:h-[66svh] lg:h-[calc(100svh-9.5rem)] lg:max-h-[860px]">
          {photo ? (
            <div className="absolute inset-0 animate-fade-in bg-white p-6 sm:p-10">
              <Image src={photo.url} alt={name} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-6 sm:p-10" />
            </div>
          ) : (
            <ProductViewer
              config={model3d}
              color={color}
              modelUrl={modelUrl}
              fallbackImage={images[0] ?? null}
              alt={name}
              labels={{ dragHint: labels.dragHint, loading: labels.loading3d, fallback: labels.fallback3d }}
            />
          )}
        </div>

        {images.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label={labels.photos}>
            <button
              type="button"
              role="tab"
              aria-selected={view === -1}
              onClick={() => setView(-1)}
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-sm font-bold tracking-tight ring-1 transition ${
                view === -1 ? "bg-white text-black ring-white" : "bg-graphite-900 text-white/70 ring-white/10 hover:ring-white/30"
              }`}
              aria-label={labels.view3d}
            >
              3D
            </button>
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                role="tab"
                aria-selected={view === i}
                onClick={() => setView(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 transition ${view === i ? "ring-white" : "ring-white/10 hover:ring-white/30"}`}
                aria-label={`${labels.photos} ${i + 1}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* -------- info column -------- */}
      <div className="flex flex-col">
        {header}

        {colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm text-white/50">
              {labels.color}: <span className="text-white">{colors[colorIdx]?.name}</span>
            </legend>
            <div className="flex flex-wrap gap-3">
              {colors.map((c, i) => (
                <label key={c.hex + i} className="cursor-pointer" title={c.name}>
                  <input
                    type="radio"
                    name="color"
                    className="peer sr-only"
                    checked={i === colorIdx}
                    onChange={() => {
                      setColorIdx(i);
                      // photos are ordered like colours: keep showing a photo, just of the chosen colour
                      setView((v) => (v >= 0 && images.length === colors.length ? i : -1));
                    }}
                  />
                  <span className="sr-only">{c.name}</span>
                  <span
                    className="block h-10 w-10 rounded-full ring-1 ring-white/20 ring-offset-[3px] ring-offset-black transition peer-checked:ring-2 peer-checked:ring-white peer-focus-visible:ring-2 peer-focus-visible:ring-signal-bright"
                    style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), transparent 55%), ${c.hex}` }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {storageOptions.length > 0 && (
          <fieldset className="mt-7">
            <legend className="mb-3 text-sm text-white/50">{labels.storage}</legend>
            <div className="flex flex-wrap gap-2">
              {storageOptions.map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="radio" name="storage" className="peer sr-only" checked={s === storage} onChange={() => setStorage(s)} />
                  <span className="block rounded-2xl border border-white/12 px-5 py-3 text-sm font-medium text-white/75 transition peer-checked:border-white peer-checked:bg-white peer-checked:text-black peer-focus-visible:ring-2 peer-focus-visible:ring-signal-bright hover:border-white/35">
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {actions}
        {children}
      </div>
    </div>
  );
}
