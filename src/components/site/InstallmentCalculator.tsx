"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { formatPrice, telHref } from "@/lib/localize";
import type { InstallmentPlan } from "@/lib/types";

export type InstallmentLabels = {
  title: string;
  perMonth: string;
  months: string;
  total: string;
  note: string;
  call: string;
};

/** Monthly payment rounded up to 1 000 sum. */
export function monthlyPayment(price: number, plan: InstallmentPlan) {
  return Math.ceil((price * (1 + plan.markup / 100)) / plan.months / 1000) * 1000;
}

export default function InstallmentCalculator({
  price,
  plans,
  locale,
  phone,
  labels,
}: {
  price: number;
  plans: InstallmentPlan[];
  locale: Locale;
  phone?: string;
  labels: InstallmentLabels;
}) {
  const sorted = [...plans].sort((a, b) => a.months - b.months);
  const [idx, setIdx] = useState(Math.max(0, sorted.length - 1));
  const plan = sorted[Math.min(idx, sorted.length - 1)];
  if (!plan) return null;
  const monthly = monthlyPayment(price, plan);
  const total = Math.round(price * (1 + plan.markup / 100));

  return (
    <section className="mt-8 rounded-3xl bg-graphite-900 p-5 ring-1 ring-white/[0.06] sm:p-6" aria-labelledby="installment-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="installment-title" className="text-base font-semibold tracking-tight">
          {labels.title}
        </h2>
        <div className="flex rounded-full bg-white/[0.06] p-1" role="radiogroup" aria-label={labels.title}>
          {sorted.map((pl, i) => (
            <button
              key={`${pl.months}-${i}`}
              type="button"
              role="radio"
              aria-checked={i === idx}
              onClick={() => setIdx(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums transition sm:px-3.5 ${i === idx ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
            >
              {labels.months.replace("{n}", String(pl.months))}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatPrice(monthly, locale)}</span>
        <span className="text-sm text-white/50">{labels.perMonth}</span>
      </p>
      <p className="mt-1 text-sm text-white/45 tabular-nums">
        {labels.total.replace("{price}", formatPrice(total, locale))}
        {plan.markup > 0 && <span className="text-white/35"> · +{plan.markup}%</span>}
      </p>
      <p className="mt-4 text-xs leading-relaxed text-white/35">{labels.note}</p>
      {phone && (
        <a href={telHref(phone)} className="btn btn-light mt-5 w-full !py-3 text-sm">
          {labels.call} · {phone}
        </a>
      )}
    </section>
  );
}
