"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Option = { slug: string; label: string; count: number };

type Labels = {
  category: string;
  allCategories: string;
  brand: string;
  allBrands: string;
  sort: string;
  sortPopular: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortNewest: string;
  inStockOnly: string;
  reset: string;
  searchPlaceholder: string;
  searchLabel: string;
  clear: string;
};

export default function CatalogFilters({ categories, brands, labels }: { categories: Option[]; brands: Option[]; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const category = params.get("category") ?? "";
  const selectedBrands = (params.get("brand") ?? "").split(",").filter(Boolean);
  const sort = params.get("sort") ?? "popular";
  const inStock = params.get("stock") === "1";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // debounce text search into the URL
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q.trim() === current.trim()) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    document.body.toggleAttribute("data-catalog-pending", pending);
  }, [pending]);

  const toggleBrand = (slug: string) => {
    const set = new Set(selectedBrands);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    update({ brand: [...set].join(",") || null });
  };

  const hasFilters = !!(category || selectedBrands.length || inStock || params.get("q") || sort !== "popular");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex h-12 flex-1 items-center rounded-full border border-white/10 bg-white/[0.05] pl-11 pr-2 focus-within:border-white/30">
          <svg className="absolute left-4 h-[18px] w-[18px] text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" strokeLinecap="round" />
          </svg>
          <span className="sr-only">{labels.searchLabel}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.searchPlaceholder}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] text-white outline-none placeholder:text-white/45"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" aria-label={labels.clear}>
              ✕
            </button>
          )}
        </label>
        <div className="flex items-center gap-3">
          <label className="relative flex h-12 flex-1 items-center md:flex-none">
            <span className="sr-only">{labels.sort}</span>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "popular" ? null : e.target.value })}
              className="h-full w-full appearance-none rounded-full border border-white/10 bg-white/[0.05] pl-5 pr-10 text-sm text-white outline-none focus:border-white/30 md:w-56"
            >
              <option value="popular">{labels.sortPopular}</option>
              <option value="price_asc">{labels.sortPriceAsc}</option>
              <option value="price_desc">{labels.sortPriceDesc}</option>
              <option value="newest">{labels.sortNewest}</option>
            </select>
            <svg className="pointer-events-none absolute right-4 h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={inStock}
            onClick={() => update({ stock: inStock ? null : "1" })}
            className="flex h-12 shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] pl-4 pr-3 text-sm text-white/80 hover:border-white/25"
          >
            {labels.inStockOnly}
            <span className={`relative h-6 w-10 rounded-full transition-colors ${inStock ? "bg-ok" : "bg-white/15"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${inStock ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </span>
          </button>
        </div>
      </div>

      <div role="group" aria-label={labels.category} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" className="chip" data-active={!category} onClick={() => update({ category: null })}>
          {labels.allCategories}
        </button>
        {categories.map((c) => (
          <button key={c.slug} type="button" className="chip" data-active={category === c.slug} onClick={() => update({ category: category === c.slug ? null : c.slug })}>
            {c.label}
            <span className="opacity-50">{c.count}</span>
          </button>
        ))}
      </div>

      {brands.length > 0 && (
        <div role="group" aria-label={labels.brand} className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="mr-1 shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-white/35">{labels.brand}</span>
          {brands.map((b) => (
            <button
              key={b.slug}
              type="button"
              aria-pressed={selectedBrands.includes(b.slug)}
              className="chip !py-1.5 text-[0.82rem]"
              data-active={selectedBrands.includes(b.slug)}
              onClick={() => toggleBrand(b.slug)}
            >
              {b.label}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                startTransition(() => router.replace(pathname, { scroll: false }));
              }}
              className="ml-auto shrink-0 text-sm text-signal-bright hover:underline"
            >
              {labels.reset}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
