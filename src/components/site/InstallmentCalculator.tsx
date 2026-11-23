"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { formatPrice, telHref } from "@/lib/localize";
import type { Currency, InstallmentOffer, InstallmentPlan } from "@/lib/types";

export type InstallmentLabels = {
  title: string;
  perMonth: string;
  months: string;
  total: string;
  note: string;
  call: string;
  /** "Первый взнос {price}" */
  down: string;
  /** note shown with the unit's own terms */
  offerNote: string;
};

/** Monthly payment for a site-wide plan, rounded up (1 000 sum / 1 $). */
export function monthlyPayment(price: number, plan: InstallmentPlan, currency: Currency = "UZS") {
  const step = currency === "USD" ? 1 : 1000;
  return Math.ceil((price * (1 + plan.markup / 100)) / plan.months / step) * step;
}

type Row = { key: string; months: number; monthly: number; down: number; total: number; markup: number };

/**
 * Installment block on the product page.
 *  - `offers`: exact terms for this particular unit (down payment + monthly), as the store publishes them;
 *  - otherwise the site-wide plans (months + markup %) are applied to the price.
 */
export default function InstallmentCalculator({
  price,
  plans,
  offers = [],
  currency = "UZS",
  locale,
  phone,
  labels,
}: {
  price: number;
  plans: InstallmentPlan[];
  offers?: InstallmentOffer[];
  currency?: Currency;
  locale: Locale;
  phone?: string;
  labels: InstallmentLabels;
}) {
  const fromOffers = offers.length > 0;
  const rows: Row[] = fromOffers
    ? offers.map((o, i) => ({ key: `o${i}`, months: o.months, monthly: o.monthly, down: o.down, total: o.down + o.monthly * o.months, markup: 0 }))
    : [...plans]
        .sort((a, b) => a.months - b.months)
        .map((pl, i) => ({
          key: `p${i}`,
          months: pl.months,
          monthly: monthlyPayment(price, pl, currency),
          down: 0,
          total: Math.round(price * (1 + pl.markup / 100)),
          markup: pl.markup,
        }));
  const [idx, setIdx] = useState(Math.max(0, rows.length - 1));
  const row = rows[Math.min(idx, rows.length - 1)];
  if (!row) return null;
  const fmt = (n: number) => formatPrice(n, locale, currency);
  const dupMonths = new Set(rows.map((r) => r.months)).size < rows.length;

  return (
    <section className="mt-8 rounded-3xl bg-graphite-900 p-5 ring-1 ring-white/[0.06] sm:p-6" aria-labelledby="installment-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="installment-title" className="text-base font-semibold tracking-tight">
          {labels.title}
        </h2>
        {rows.length > 1 && (
          <div className="flex rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label={labels.title}>
            {rows.map((r, i) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={i === idx}
                onClick={() => setIdx(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums transition sm:px-3.5 ${i === idx ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
              >
                {labels.months.replace("{n}", String(r.months))}
                {dupMonths && r.down > 0 && <span className="font-normal opacity-70"> · {fmt(r.down)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{fmt(row.monthly)}</span>
        <span className="text-sm text-white/50">
          {labels.perMonth}
          {rows.length === 1 && ` · ${labels.months.replace("{n}", String(row.months))}`}
        </span>
      </p>
      {row.down > 0 && <p className="mt-1 text-sm font-medium text-white/80 tabular-nums">{labels.down.replace("{price}", fmt(row.down))}</p>}
      <p className="mt-1 text-sm text-white/45 tabular-nums">
        {labels.total.replace("{price}", fmt(row.total))}
        {row.markup > 0 && <span className="text-white/35"> · +{row.markup}%</span>}
      </p>
      <p className="mt-4 text-xs leading-relaxed text-white/35">{fromOffers ? labels.offerNote : labels.note}</p>
      {phone && (
        <a href={telHref(phone)} className="btn btn-light mt-5 w-full !py-3 text-sm">
          {labels.call} · {phone}
        </a>
      )}
    </section>
  );
}
