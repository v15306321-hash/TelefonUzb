"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, localeMeta, locales, switchLocalePath, type Locale } from "@/i18n/config";

export function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage unavailable (private mode) — cookie is enough */
  }
}

export default function LanguageSwitcher({ locale, label, className = "" }: { locale: Locale; label: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const go = (target: Locale) => {
    if (target === locale) return;
    persistLocale(target);
    const url = switchLocalePath(pathname, target) + window.location.search + window.location.hash;
    startTransition(() => router.push(url, { scroll: false }));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] p-0.5 text-[0.72rem] font-semibold tracking-wide ${pending ? "opacity-70" : ""} ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ transform: `translateX(${locales.indexOf(locale) * 100}%)`, left: 2 }}
      />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => go(l)}
          aria-pressed={l === locale}
          lang={localeMeta[l].htmlLang}
          title={localeMeta[l].label}
          className={`relative z-10 min-w-10 rounded-full px-2.5 py-1.5 transition-colors duration-300 ${l === locale ? "text-black" : "text-white/70 hover:text-white"}`}
        >
          {localeMeta[l].short}
        </button>
      ))}
    </div>
  );
}
