"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { CatalogImage } from "@/lib/catalog";
import ProductGallery from "./ProductGallery";

type ColorView = { name: string; hex: string };

type Labels = {
  color: string;
  storage: string;
  photos: string;
  prevPhoto: string;
  nextPhoto: string;
  openPhoto: string;
  closePhoto: string;
};

export default function ProductShowcase({
  name,
  images,
  colors,
  storageOptions,
  labels,
  header,
  actions,
  children,
}: {
  name: string;
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
  const hex = colors[colorIdx]?.hex.toLowerCase();

  // photos of the selected colour (+ photos valid for every colour); all photos if none are linked
  const shown = useMemo(() => {
    const own = images.filter((i) => i.color === hex || i.color === null);
    return own.length ? own : images;
  }, [images, hex]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.12fr_1fr] lg:gap-14">
      {/* -------- photos -------- */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          images={shown}
          alt={colors[colorIdx] ? `${name}, ${colors[colorIdx].name}` : name}
          labels={{ photos: labels.photos, prev: labels.prevPhoto, next: labels.nextPhoto, open: labels.openPhoto, close: labels.closePhoto }}
        />
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
                    onChange={() => setColorIdx(i)}
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
