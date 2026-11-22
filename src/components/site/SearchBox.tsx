"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { formatPrice } from "@/lib/localize";

type Suggestion = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  priceFrom: boolean;
  inStock: boolean;
  image: { url: string } | null;
};

type Labels = {
  placeholder: string;
  label: string;
  submit: string;
  clear: string;
  noResults: string;
  viewAll: string;
  searching: string;
  error: string;
};

export default function SearchBox({
  locale,
  labels,
  variant = "hero",
  defaultValue = "",
  autoFocus = false,
}: {
  locale: Locale;
  labels: Labels;
  variant?: "hero" | "compact";
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?locale=${locale}&limit=6&q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Suggestion[]; total: number };
        setItems(data.items);
        setTotal(data.total);
        setActive(-1);
        setStatus("done");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, locale]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (active >= 0 && items[active]) {
      router.push(`/${locale}/product/${items[active].slug}`);
    } else {
      const term = q.trim();
      router.push(term ? `/${locale}/catalog?q=${encodeURIComponent(term)}` : `/${locale}/catalog`);
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && q.trim().length >= 2;
  const hero = variant === "hero";

  return (
    <form ref={wrapRef} role="search" onSubmit={submit} className={`relative w-full ${hero ? "max-w-[680px]" : ""}`} aria-label={labels.label}>
      <div
        className={`group flex items-center transition-[box-shadow,background-color,border-color] duration-300 ${
          hero
            ? "glass h-[60px] rounded-full pl-6 pr-2 focus-within:border-white/35 focus-within:bg-white/[0.16] sm:h-[66px] sm:pl-7"
            : "h-12 rounded-full border border-white/10 bg-white/[0.06] pl-5 pr-1.5 focus-within:border-white/30"
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus={autoFocus}
          spellCheck={false}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          aria-label={labels.label}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          className={`min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/55 ${hero ? "text-[1.02rem] sm:text-lg" : "text-[0.95rem]"}`}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="mr-1 grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            aria-label={labels.clear}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          aria-label={labels.submit}
          className={`grid shrink-0 place-items-center rounded-full transition-colors ${
            hero ? "h-11 w-11 text-white/85 hover:bg-white/15 sm:h-12 sm:w-12" : "h-9 w-9 text-white/70 hover:bg-white/10"
          }`}
        >
          <SearchIcon className={hero ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]"} />
        </button>
      </div>

      {showPanel && (
        <div
          className={`absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-3xl border border-white/10 bg-graphite-900/95 text-left shadow-2xl shadow-black/60 backdrop-blur-2xl animate-fade-in`}
        >
          {status === "loading" && !items.length && <p className="px-5 py-4 text-sm text-white/55">{labels.searching}</p>}
          {status === "error" && <p className="px-5 py-4 text-sm text-signal-bright">{labels.error}</p>}
          {status === "done" && !items.length && <p className="px-5 py-4 text-sm text-white/55">{labels.noResults}</p>}
          {items.length > 0 && (
            <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
              {items.map((it, i) => (
                <li key={it.slug} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
                  <Link
                    href={`/${locale}/product/${it.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-4 px-4 py-2.5 transition-colors ${i === active ? "bg-white/[0.07]" : ""}`}
                  >
                    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                      {it.image && <Image src={it.image.url} alt="" width={96} height={96} className="h-full w-full object-contain p-1" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-medium text-white">{it.name}</span>
                      <span className="block truncate text-xs text-white/45">
                        {it.brand} · {it.category}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-semibold text-white">{it.priceFrom && <span className="font-normal text-white/45">{locale === "uz" ? "" : "от "}</span>}{formatPrice(it.price, locale)}{it.priceFrom && locale === "uz" ? <span className="font-normal text-white/45">dan</span> : null}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <button type="submit" className="flex w-full items-center justify-between border-t border-white/[0.06] px-5 py-3.5 text-sm font-medium text-white/75 hover:bg-white/[0.04] hover:text-white">
              {labels.viewAll} {total > items.length ? `(${total})` : ""}
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}
    </form>
  );
}

export function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" strokeLinecap="round" />
    </svg>
  );
}
