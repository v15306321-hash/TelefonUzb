"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { CatalogImage } from "@/lib/catalog";
import { formatPrice } from "@/lib/localize";
import { telegramTopic } from "@/lib/telegram";
import type { Currency, InstallmentOffer, InstallmentPlan } from "@/lib/types";
import InstallmentCalculator, { monthlyPayment, type InstallmentLabels } from "./InstallmentCalculator";
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
  /** "или от {price}/мес в рассрочку" */
  installmentShort: string;
};

export default function ProductShowcase({
  name,
  images,
  colors,
  storageOptions,
  storagePrices,
  basePrice,
  currency = "UZS",
  locale,
  installment,
  labels,
  header,
  stock,
  actions,
  children,
}: {
  name: string;
  images: CatalogImage[];
  colors: ColorView[];
  storageOptions: string[];
  /** price for every storage option */
  storagePrices: Record<string, number>;
  basePrice: number;
  currency?: Currency;
  locale: Locale;
  /** plans: site-wide calculator (empty when switched off); offers: this unit's own terms */
  installment: { plans: InstallmentPlan[]; offers: InstallmentOffer[]; phone?: string; labels: InstallmentLabels } | null;
  labels: Labels;
  header: ReactNode;
  stock: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  const [colorIdx, setColorIdx] = useState(0);
  const [storage, setStorage] = useState(storageOptions[0] ?? "");
  const hex = colors[colorIdx]?.hex.toLowerCase();
  const price = (storage && storagePrices[storage]) || basePrice;
  const colorName = colors[colorIdx]?.name;
  const priceVaries = new Set(storageOptions.map((o) => storagePrices[o] ?? basePrice)).size > 1;

  // the Telegram button sends the selected configuration
  useEffect(() => {
    telegramTopic.set([name, storage, colorName, formatPrice(price, locale, currency)].filter(Boolean).join(", "));
  }, [name, storage, colorName, price, locale, currency]);
  useEffect(() => () => telegramTopic.set(null), []);

  const lowestMonthly = installment?.offers.length
    ? Math.min(...installment.offers.map((o) => o.monthly))
    : installment?.plans.length
      ? Math.min(...installment.plans.map((pl) => monthlyPayment(price, pl, currency)))
      : null;
  const showInstallment = !!installment && (installment.offers.length > 0 || installment.plans.length > 0);

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
        <div className="mt-6 animate-fade-up [animation-delay:80ms]">
          <p className="text-3xl font-semibold tracking-tight tabular-nums" aria-live="polite">
            {formatPrice(price, locale, currency)}
          </p>
          {lowestMonthly && <p className="mt-1.5 text-sm text-white/50">{labels.installmentShort.replace("{price}", formatPrice(lowestMonthly, locale, currency))}</p>}
        </div>
        {stock}

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
                    {priceVaries && <span className="mt-0.5 block text-[0.72rem] font-normal tabular-nums opacity-60">{formatPrice(storagePrices[s] ?? basePrice, locale, currency)}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {showInstallment && installment && (
          <InstallmentCalculator
            price={price}
            plans={installment.plans}
            offers={installment.offers}
            currency={currency}
            locale={locale}
            phone={installment.phone}
            labels={installment.labels}
          />
        )}
        {actions}
        {children}
      </div>
    </div>
  );
}
