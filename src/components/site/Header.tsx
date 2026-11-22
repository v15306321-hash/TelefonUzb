"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { telHref } from "@/lib/localize";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

type Labels = { home: string; catalog: string; contacts: string; menu: string; close: string; call: string; label: string; switchTo: string };

export default function Header({ locale, logo, mainPhone, labels }: { locale: Locale; logo: string; mainPhone: string; labels: Labels }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const isHome = pathname === `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const nav = [
    { href: `/${locale}/catalog`, label: labels.catalog, active: pathname.startsWith(`/${locale}/catalog`) || pathname.startsWith(`/${locale}/product`) },
    { href: `/${locale}/contacts`, label: labels.contacts, active: pathname.startsWith(`/${locale}/contacts`) },
  ];

  const solid = scrolled || !isHome || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid ? "border-b border-white/[0.07] bg-black/70 backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent bg-gradient-to-b from-black/50 to-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <Link href={`/${locale}`} className="flex items-center gap-3" aria-label={`TELEFON.UZB — ${labels.home}`}>
          <Logo src={logo} size={38} priority />
          <span className="hidden text-[0.95rem] font-extrabold tracking-[-0.01em] sm:block">
            TELEFON<span className="text-white/50">.</span>UZB
            <span className="ml-1.5 align-top text-[0.62rem] font-semibold tracking-wide text-signal-bright">premium</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={labels.menu}>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${n.active ? "text-white" : "text-white/65 hover:text-white"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher locale={locale} label={labels.label} />
          {mainPhone && (
            <a href={telHref(mainPhone)} className="btn btn-light hidden !px-4 !py-2.5 text-sm lg:inline-flex">
              <PhoneIcon />
              {mainPhone}
            </a>
          )}
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-white/12 md:hidden"
            aria-label={open ? labels.close : labels.menu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`absolute h-[1.5px] w-4 bg-white transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[4px]"}`} />
            <span className={`absolute h-[1.5px] w-4 bg-white transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[4px]"}`} />
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <div
        id="mobile-menu"
        className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="min-h-0">
          <nav className="container-x flex flex-col gap-1 pb-6 pt-2">
            {[{ href: `/${locale}`, label: labels.home, active: isHome }, ...nav].map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-2xl px-3 py-3 text-2xl font-semibold tracking-tight ${n.active ? "text-white" : "text-white/60"}`}>
                {n.label}
              </Link>
            ))}
            {mainPhone && (
              <a href={telHref(mainPhone)} className="btn btn-primary mt-4 w-full !py-3.5">
                <PhoneIcon />
                {labels.call} · {mainPhone}
              </a>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M5 4h3l1.6 4.2-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2L20 16v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
